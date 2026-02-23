from fastapi import FastAPI, Depends, HTTPException, status
from typing import List
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

from . import models, schemas
from .auth import authenticate_user, create_access_token, get_password_hash, get_current_user
from .database import engine, Base, get_db
from . import chat_models  # import so tables get created
from .chat_routes import router as chat_router
from .search_engine import semantic_search, invalidate_listing, preload_models
import threading
import smtplib
import ssl
import random
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

models.Base.metadata.create_all(bind=engine)
chat_models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Exo Exchange API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL ERROR CATCHER ---
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    err_detail = traceback.format_exc()
    print(f"\n{'!'*20}\nGLOBAL UNCAUGHT ERROR:\n{err_detail}\n{'!'*20}\n", flush=True)
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)}
    )

# Register chat router
app.include_router(chat_router)

@app.on_event("startup")
def startup_event():
    # Load models synchronously (no thread) to avoid silent crashes
    preload_models()


@app.get("/health")
def health_check():
    return {"status": "ok"}


def send_otp_email(email: str, otp: str):
    sender_email = os.getenv("GMAIL_USER")
    sender_password = os.getenv("GMAIL_PASSWORD")
    
    if not sender_email or not sender_password:
        print("!!! GMAIL CREDENTIALS NOT SET in .env !!!")
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = str("Exo Exchange - Your Verification Code")
    message["From"] = str(sender_email)
    message["To"] = str(email)

    text = f"Your verification code is: {otp}. It expires in 5 minutes."
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1d4ed8; text-align: center;">Verify Your Account</h2>
          <p>Hello,</p>
          <p>Thank you for choosing <strong>Exo Exchange</strong>. Use the following code to complete your verification:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; padding: 10px 20px; border: 2px dashed #cbd5e1; border-radius: 8px;">{otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you didn't request this, please ignore this email.</p>
        </div>
      </body>
    </html>
    """
    message.attach(MIMEText(text, "plain"))
    message.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(str(sender_email), str(sender_password))
            server.sendmail(str(sender_email), email, message.as_string())
        return True
    except Exception as e:
        print(f"!!! EMAIL ERROR: {e}")
        return False


@app.post("/auth/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=payload.email,
        name=payload.name,
        phone=payload.phone,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "is_verified": user.is_verified}


@app.post("/auth/request-otp")
def request_otp(payload: schemas.OTPRequest, db: Session = Depends(get_db)):
    # Generate 6 digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Store in DB
    now = int(time.time())
    expires = now + (10 * 60) # 10 minutes
    
    # Remove old OTPs for this email
    db.query(models.OTP).filter(models.OTP.email == payload.email).delete()
    
    new_otp = models.OTP(
        email=payload.email,
        otp=otp_code,
        created_at=now,
        expires_at=expires
    )
    db.add(new_otp)
    db.commit()
    
    # Send Email
    success = send_otp_email(payload.email, otp_code)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email. Check server logs.")
    
    return {"message": "OTP sent to your email"}


@app.post("/auth/verify-otp")
def verify_otp(payload: schemas.OTPVerify, db: Session = Depends(get_db)):
    now = int(time.time())
    db_otp = db.query(models.OTP).filter(
        models.OTP.email == payload.email,
        models.OTP.otp == payload.otp
    ).first()
    
    if not db_otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    if now > db_otp.expires_at:
        raise HTTPException(status_code=400, detail="OTP code has expired")
    
    # Mark user as verified
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        user.is_verified = True
        db.delete(db_otp) # Clean up
        db.commit()
        return {"message": "Email verified successfully!"}
    
    raise HTTPException(status_code=404, detail="User not found")


@app.get("/auth/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.put("/auth/profile", response_model=schemas.User)
def update_profile(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user's profile details."""
    if payload.email and payload.email != current_user.email:
        existing = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = payload.email

    if payload.name:
        current_user.name = payload.name
    
    if payload.phone is not None:
        current_user.phone = payload.phone
        
    if payload.password:
        current_user.hashed_password = get_password_hash(payload.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/listings", response_model=schemas.Listing, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: schemas.ListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    print(f"--> API REQUEST: Creating listing '{payload.title}'", flush=True)
    try:
        data = payload.model_dump()
        image_urls = data.pop("image_urls", [])
        
        listing = models.Listing(**data, owner_id=current_user.id)
        db.add(listing)
        db.commit()
        db.refresh(listing)
        
        # Add primary image records
        for url in image_urls:
            product_image = models.ProductImage(url=url, listing_id=listing.id)
            db.add(product_image)
        
        db.commit()
        db.refresh(listing)
        
        print(f"--> SUCCESS: Listing {listing.id} created in DB with {len(image_urls)} images", flush=True)
        
        try:
            # Invalidate query cache so new listing is immediately searchable
            invalidate_listing(listing.id)
            print(f"--> [DEBUG] Cache invalidated for {listing.id}", flush=True)
        except Exception as cache_err:
            print(f"!!! WARNING: Cache invalidation failed: {cache_err}", flush=True)
            
        return listing
    except Exception as e:
        import traceback
        print(f"!!! ERROR in create_listing:\n{traceback.format_exc()}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/listings", response_model=list[schemas.Listing])
def list_listings(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    print(f"--> API REQUEST: Fetching listings (skip={skip}, limit={limit})", flush=True)
    try:
        items = (
            db.query(models.Listing)
            .filter(models.Listing.is_active == True)  # noqa: E712
            .offset(skip)
            .limit(limit)
            .all()
        )
        print(f"--> SUCCESS: Found {len(items)} active listings", flush=True)
        return items
    except Exception as e:
        import traceback
        print(f"!!! ERROR in list_listings:\n{traceback.format_exc()}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/listings/me", response_model=list[schemas.Listing])
def list_my_listings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch listings belonging to the current user."""
    return db.query(models.Listing).filter(models.Listing.owner_id == current_user.id).all()


@app.get("/listings/{listing_id}", response_model=schemas.Listing)
def get_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@app.put("/listings/{listing_id}", response_model=schemas.Listing)
def update_listing(
    listing_id: int,
    payload: schemas.ListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    print(f"--> API REQUEST: Updating listing {listing_id}", flush=True)
    try:
        listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this listing")

        data = payload.model_dump()
        image_urls = data.pop("image_urls", [])

        for key, value in data.items():
            setattr(listing, key, value)

        # Update images: Simple approach - remove old and add new
        db.query(models.ProductImage).filter(models.ProductImage.listing_id == listing_id).delete()
        for url in image_urls:
            product_image = models.ProductImage(url=url, listing_id=listing.id)
            db.add(product_image)

        db.commit()
        db.refresh(listing)
        
        try:
            invalidate_listing(listing_id)
        except:
            pass
            
        return listing
    except Exception as e:
        import traceback
        print(f"!!! ERROR in update_listing:\n{traceback.format_exc()}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/listings/{listing_id}")
def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    print(f"--> API REQUEST: Deleting listing {listing_id}", flush=True)
    try:
        listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this listing")

        lid = listing.id
        db.delete(listing)
        db.commit()
        
        try:
            invalidate_listing(lid)
        except Exception as cache_err:
            print(f"!!! WARNING: Cache invalidation failed: {cache_err}", flush=True)
            
        return {"status": "ok", "message": "Listing deleted"}
    except Exception as e:
        import traceback
        print(f"!!! ERROR in delete_listing:\n{traceback.format_exc()}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────
# Semantic Search Endpoint
# ──────────────────────────────────────────────────────────────────────

@app.get("/search")
def search_listings(
    q: str,
    top_k: int = 20,
    min_score: float = 0.35,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Simple debug search endpoint."""
    print(f"\n--> API REQUEST: /search?q={q}", flush=True)
    
    if not q.strip():
        return {"results": [], "total": 0}

    print(f"--> [DEBUG] Calling search_engine.semantic_search...", flush=True)
    try:
        # 1. Call search engine
        raw = semantic_search(query=q.strip(), db=db, top_k=top_k)
        
        # 2. Precise Validation using Schemas
        results = []
        for r in raw:
            try:
                # Convert SQLAlchemy model to Pydantic
                listing_schema = schemas.Listing.model_validate(r["listing"])
                results.append(
                    schemas.SearchResult(
                        listing=listing_schema,
                        score=r["score"],
                        match_type=r.get("match_type", "semantic")
                    )
                )
            except Exception as val_err:
                print(f"--> [DEBUG] Skipping one result due to validation error: {val_err}", flush=True)
                continue
            
        print(f"--> SUCCESS: Validated {len(results)} results for frontend.", flush=True)
        return schemas.SearchResponse(
            query=q.strip(),
            total=len(results),
            results=results
        )
        
    except Exception as e:
        import traceback
        print(f"!!! CRITICAL API ERROR in search_listings:\n{traceback.format_exc()}", flush=True)
        return JSONResponse(status_code=500, content={"error": "Search failed", "detail": str(e)})


# ──────────────────────────────────────────────────────────────────────
# Wishlist Endpoints
# ──────────────────────────────────────────────────────────────────────

@app.post("/wishlist/{listing_id}", response_model=schemas.WishlistItem)
def add_to_wishlist(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Check if already in wishlist
    existing = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == current_user.id,
        models.WishlistItem.listing_id == listing_id
    ).first()
    if existing:
        return existing
    
    # Check if listing exists
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot add your own listing to your wishlist")
        
    wish_item = models.WishlistItem(user_id=current_user.id, listing_id=listing_id)
    db.add(wish_item)
    db.commit()
    db.refresh(wish_item)
    return wish_item


@app.get("/wishlist", response_model=List[schemas.WishlistItem])
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).all()


@app.delete("/wishlist/{listing_id}")
def remove_from_wishlist(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = db.query(models.WishlistItem).filter(
        models.WishlistItem.user_id == current_user.id,
        models.WishlistItem.listing_id == listing_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")
    
    db.delete(item)
    db.commit()
    return {"status": "ok", "message": "Removed from wishlist"}


# ──────────────────────────────────────────────────────────────────────
# Order Endpoints
# ──────────────────────────────────────────────────────────────────────

@app.post("/wishlist/checkout", response_model=schemas.Order)
def checkout_wishlist(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    wish_items = db.query(models.WishlistItem).filter(models.WishlistItem.user_id == current_user.id).all()
    if not wish_items:
        raise HTTPException(status_code=400, detail="Wishlist is empty")
    
    total_amount = sum(item.listing.price for item in wish_items)
    
    order = models.Order(user_id=current_user.id, total_amount=total_amount, status="pending")
    db.add(order)
    db.commit()
    db.refresh(order)
    
    for item in wish_items:
        order_item = models.OrderItem(
            order_id=order.id,
            listing_id=item.listing_id,
            price_at_order=item.listing.price
        )
        db.add(order_item)
        # Optionally remove from wishlist after ordering
        db.delete(item)
    
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders", response_model=List[schemas.Order])
def get_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Order).filter(models.Order.user_id == current_user.id).all()


if __name__ == "__main__":
    # Use app object directly and disable reload for maximum stability
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="debug")
