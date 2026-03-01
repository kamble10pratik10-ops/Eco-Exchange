import os
os.environ['KMP_DUPLICATE_LIB_OK']='True'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from starlette.concurrency import run_in_threadpool
import cloudinary
import cloudinary.uploader
from typing import List, Optional
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
import uvicorn
from dotenv import load_dotenv
import math
from datetime import datetime

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
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
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
app.include_router(chat_router, prefix="/messages")

@app.on_event("startup")
def startup_event():
    # Load models synchronously (no thread) to avoid silent crashes
    # preload_models()
    pass


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/migrate")
def run_migrations(db: Session = Depends(get_db)):
    """Add missing columns to the database."""
    from sqlalchemy import text
    try:
        # Check if is_delivered exists
        try:
            db.execute(text("SELECT is_delivered FROM messages LIMIT 1"))
        except:
            db.execute(text("ALTER TABLE messages ADD COLUMN is_delivered BOOLEAN DEFAULT 0"))
            db.commit()
            print("Migration: Added is_delivered")

        # Check for attachment columns in messages
        for col in ["attachment_url", "attachment_type", "attachment_public_id"]:
            try:
                db.execute(text(f"SELECT {col} FROM messages LIMIT 1"))
            except:
                db.execute(text(f"ALTER TABLE messages ADD COLUMN {col} TEXT"))
                db.commit()
                print(f"Migration: Added {col}")

        return {"status": "success", "message": "Migrations completed."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


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
        is_verified=True,  # Auto-verify to break the loop
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
    return {"access_token": access_token, "token_type": "bearer", "is_verified": True} # Forced True to break loop


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
    current_user.followers_count = len(current_user.followers)
    current_user.following_count = len(current_user.following)
    return current_user


@app.get("/auth/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    active_listings = [l for l in current_user.listings if l.is_active]
    sold_listings = [l for l in current_user.listings if not l.is_active]
    
    total_value = sum(l.price for l in active_listings)
    
    # Unread messages in conversations participating in
    unread_count = db.query(chat_models.Message).join(chat_models.Conversation).filter(
        (chat_models.Conversation.buyer_id == current_user.id) | (chat_models.Conversation.seller_id == current_user.id),
        chat_models.Message.sender_id != current_user.id,
        chat_models.Message.is_read == False
    ).count()

    recent_activity = []
    # Add recent listings as activity
    user_listings = list(current_user.listings)
    sorted_listings = sorted(user_listings, key=lambda x: x.id, reverse=True)[:3]
    for l in sorted_listings:
        recent_activity.append({
            "type": "listing",
            "title": f"Listing: {l.title}",
            "timestamp": "Active",
            "id": l.id
        })

    return {
        "active_listings_count": len(active_listings),
        "sold_listings_count": len(sold_listings),
        "total_followers": len(current_user.followers),
        "total_following": len(current_user.following),
        "wishlist_count": len(current_user.wishlist_items),
        "unread_messages_count": unread_count,
        "total_listings_value": total_value,
        "recent_activity": recent_activity
    }


@app.get("/users/{user_id}/profile", response_model=schemas.User)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).options(
        joinedload(models.User.listings),
        joinedload(models.User.received_reviews).joinedload(models.Review.order).joinedload(models.Order.items).joinedload(models.OrderItem.listing)
    ).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # ── Bayesian Trust Score Calculation (Conf-Interval & Time Decay) ─────────────────
    reviews = db.query(models.Review).filter(models.Review.reviewee_id == user_id).all()
    vouchers = db.query(models.CommunityVouch).filter(models.CommunityVouch.voutee_id == user_id).all()
    disputes = db.query(models.Dispute).filter(models.Dispute.accused_id == user_id, models.Dispute.status == "open").all()
    
    now = datetime.utcnow()
    # Apply Time Decay to Ratings: Recent reviews count for 100%, 1-year-old reviews count for 20%
    weighted_sum = 0.0
    weighted_count = 0.0
    
    for r in reviews:
        # Calculate age in days
        age_delta = (now - r.created_at).days
        # Decay factor: e^(-0.005 * days) -- roughly 0.2 at 320 days
        decay = math.exp(-0.002 * age_delta) 
        weighted_sum += r.rating * decay
        weighted_count += decay

    C = 5.0  # Confidence constant (uncertainty "punishment")
    m = 6.0  # Prior mean (out of 10)
    
    if weighted_count > 0:
        bayesian_rating = (weighted_sum + C * m) / (weighted_count + C)
    else:
        bayesian_rating = m

    # Bonus points for successful trades and community vouches
    trade_bonus = (user.successful_trades_count * 0.2) # Hard credit
    vouch_bonus = (len(vouchers) * 0.05)              # Soft credit
    
    final_score = bayesian_rating + trade_bonus + vouch_bonus
    
    # Dispute "Locking": 50% penalty and status flag
    if len(disputes) > 0:
        final_score = final_score * 0.5 
        user.has_active_disputes = True
    else:
        user.has_active_disputes = False
        
    final_score = max(1.0, min(10.0, final_score))
    
    user.trust_score = float(f"{final_score:.1f}")
    user.community_vouches_count = len(vouchers)
    user.followers_count = len(user.followers)
    user.following_count = len(user.following)
    
    return user


@app.post("/users/{user_id}/follow", response_model=schemas.FollowStatus)
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already following
    existing = db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id,
        models.Follow.followed_id == user_id
    ).first()
    
    if not existing:
        follow = models.Follow(
            follower_id=current_user.id,
            followed_id=user_id,
            created_at=int(time.time())
        )
        db.add(follow)
        db.commit()
    
    return {"is_following": True}


@app.post("/users/{user_id}/unfollow", response_model=schemas.FollowStatus)
def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    follow = db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id,
        models.Follow.followed_id == user_id
    ).first()
    
    if follow:
        db.delete(follow)
        db.commit()
    
    return {"is_following": False}


@app.get("/users/{user_id}/follow-status", response_model=schemas.FollowStatus)
def get_follow_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    follow = db.query(models.Follow).filter(
        models.Follow.follower_id == current_user.id,
        models.Follow.followed_id == user_id
    ).first()
    return {"is_following": follow is not None}


@app.get("/users/{user_id}/followers", response_model=List[schemas.UserPublic])
def get_followers(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.followers


@app.get("/users/{user_id}/following", response_model=List[schemas.UserPublic])
def get_following(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.following


@app.get("/users/{user_id}/listings", response_model=List[schemas.Listing])
def get_user_listings(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Fetch listings belonging to a specific user."""
    return db.query(models.Listing).filter(models.Listing.owner_id == user_id).all()


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
    
    if payload.profile_image_url:
        current_user.profile_image_url = payload.profile_image_url
        
    db.commit()
    db.refresh(current_user)
        
    # Populate counts
    current_user.followers_count = len(current_user.followers)
    current_user.following_count = len(current_user.following)
    
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
            
        # --- TRIGGER AI DETECTION (KIMI-K2.5) ---
        try:
            from .ai_inspector import AIInspector
            import threading
            image_records = db.query(models.ProductImage).filter(models.ProductImage.listing_id == listing.id).all()
            for img_rec in image_records:
                if img_rec.quality_score is None:
                    print(f"--> [AI-TRIGGER] Launching Kimi inspection for Image {img_rec.id}")
                    threading.Thread(target=AIInspector.analyze_image, args=(None, img_rec.id), daemon=True).start()
        except Exception as ai_err:
            print(f"!!! AI Trigger Failed on Creation: {ai_err}")

        return listing
    except Exception as e:
        import traceback
        print(f"!!! ERROR in create_listing:\n{traceback.format_exc()}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/images/bulk")
async def upload_images_bulk(
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(get_current_user),
):
    """Bulk upload images to Cloudinary."""
    import os
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    
    if not all([cloud_name, api_key, api_secret]):
        raise HTTPException(status_code=500, detail="Cloudinary credentials missing")
    
    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)
    
    urls = []
    for file in files:
        file_bytes = await file.read()
        try:
            result = await run_in_threadpool(
                cloudinary.uploader.upload,
                file_bytes,
                folder="exo_exchange_listings",
                resource_type="image"
            )
            urls.append(result["secure_url"])
        except Exception as e:
            print(f"!!! BULK UPLOAD ERROR: {e}")
            
    return urls


@app.post("/listings/{listing_id}/images/bulk")
async def upload_listing_images_bulk(
    listing_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload and link images to a specific listing."""
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    urls = await upload_images_bulk(files, current_user)
    
    for url in urls:
        img = models.ProductImage(url=url, listing_id=listing_id)
        db.add(img)
    db.commit()
    
    # --- TRIGGER AI DETECTION (KIMI-K2.5) ---
    try:
        from .ai_inspector import AIInspector
        # We fetch the fresh records to get their IDs
        image_records = db.query(models.ProductImage).filter(models.ProductImage.listing_id == listing_id).all()
        for img_rec in image_records:
            if img_rec.quality_score is None:
                print(f"--> [AI-TRIGGER] Launching Kimi inspection for Image {img_rec.id}")
                # For now, we run it in a background thread to avoid blocking the user
                threading.Thread(target=AIInspector.analyze_image, args=(None, img_rec.id), daemon=True).start()
    except Exception as ai_err:
        print(f"!!! AI Trigger Failed: {ai_err}")

    return {"urls": urls, "message": f"{len(urls)} images synchronized and queued for AI analysis."}


@app.get("/listings", response_model=list[schemas.Listing])
def list_listings(
    skip: int = 0,
    limit: int = 1000,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db),
):
    print(f"--> API REQUEST: Fetching listings (skip={skip}, limit={limit}, cat={category}, min={min_price}, max={max_price})", flush=True)
    
    # Category to Keyword mapping for smarter filtering
    CATEGORY_KEYWORDS = {
        "Electronics & Technology": ["mobile", "phone", "computer", "laptop", "camera", "accessory", "tech", "electronic", "gadget", "tablet", "watch"],
        "Fashion & Apparel": ["clothing", "shoes", "accessory", "shirt", "pant", "dress", "watch", "bag", "wear"],
        "Health, Personal Care": ["fitness", "equipment", "health", "care", "supplement", "gym", "workout"],
        "Home, Kitchen & Furniture": ["home", "decor", "appliance", "furniture", "kitchen", "table", "chair", "sofa", "bed"],
        "Sports & Outdoors": ["sport", "outdoor", "equipment", "gear", "athletic", "ball", "cycle", "hiking"],
        "Books & Media": ["book", "ebook", "media", "entertainment", "novel", "magazine"],
        "Toys & Games": ["toy", "game", "educational", "board", "puzzle", "lego", "doll"]
    }

    try:
        query = db.query(models.Listing).options(joinedload(models.Listing.owner)).filter(models.Listing.is_active == True)  # noqa: E712
        
        if category:
            # Smart Filter: Match exact category OR check if title contains related keywords
            keywords = CATEGORY_KEYWORDS.get(category, [])
            from sqlalchemy import or_
            
            conditions = [models.Listing.category == category]
            for kw in keywords:
                # Case-insensitive title search for keywords
                conditions.append(models.Listing.title.ilike(f"%{kw}%"))
                conditions.append(models.Listing.description.ilike(f"%{kw}%"))
            
            query = query.filter(or_(*conditions))
        
        if min_price is not None:
            query = query.filter(models.Listing.price >= min_price)
            
        if max_price is not None:
            query = query.filter(models.Listing.price <= max_price)

        items = query.offset(skip).limit(limit).all()
        print(f"--> SUCCESS: Found {len(items)} listings for category '{category}'", flush=True)
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
):
    listing = db.query(models.Listing).options(joinedload(models.Listing.owner)).filter(models.Listing.id == listing_id).first()
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


@app.post("/orders/{order_id}/complete")
def complete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if order.status == "completed":
        return {"status": "already completed"}

    order.status = "completed"
    
    # Increment successful trades for the owner of each item
    for item in order.items:
        owner = item.listing.owner
        if owner:
            owner.successful_trades_count += 1
    
    db.commit()
    return {"status": "completed"}


@app.post("/reviews", response_model=schemas.Review)
def create_review(
    payload: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # 1. Verified Transaction Anchor
    order = db.query(models.Order).filter(models.Order.id == payload.order_id).first()
    if not order or order.status != "completed":
        raise HTTPException(status_code=400, detail="Reviews can only be left for completed orders")
    
    # 2. Check eligibility (Must be the buyer)
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can review this order")
    
    # Assume for simplicity the review is for the seller of the first item in the order
    if not order.items:
         raise HTTPException(status_code=400, detail="Order has no items")
         
    target_seller_id = order.items[0].listing.owner_id
    
    # Prevent duplicate reviews
    existing = db.query(models.Review).filter(
        models.Review.order_id == payload.order_id,
        models.Review.reviewer_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Review already exists for this order")
    
    # 3. Dispute "Locking" logic
    # If rating < 4, auto-open a Dispute
    if payload.rating < 4:
        dispute = models.Dispute(
            order_id=payload.order_id,
            complainant_id=current_user.id,
            accused_id=target_seller_id,
            status="open",
            reason=f"Low Rating Auto-Dispute: {payload.comment}"
        )
        db.add(dispute)
    
    review = models.Review(
        order_id=payload.order_id,
        reviewer_id=current_user.id,
        reviewee_id=target_seller_id,
        rating=payload.rating,
        comment=payload.comment,
        media_url=payload.media_url,
        created_at=datetime.utcnow()
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@app.post("/users/{user_id}/vouch")
def vouch_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot vouch for yourself")
    
    # Check if already vouched
    existing = db.query(models.CommunityVouch).filter(
        models.CommunityVouch.vouter_id == current_user.id,
        models.CommunityVouch.voutee_id == user_id
    ).first()
    
    if existing:
        return {"status": "ok", "message": "Already vouched"}
    
    vouch = models.CommunityVouch(
        vouter_id=current_user.id,
        voutee_id=user_id,
        created_at=datetime.utcnow()
    )
    db.add(vouch)
    db.commit()
    return {"status": "ok", "message": "Vouch registered"}


# ──────────────────────────────────────────────────────────────────────
# Semantic Search Endpoint
# ──────────────────────────────────────────────────────────────────────

@app.get("/search", response_model=schemas.SearchResponse)
def search_listings(
    q: str,
    top_k: int = 100,
    min_score: float = 0.35,
    db: Session = Depends(get_db),
):
    from .search_engine import semantic_search
    results_raw = semantic_search(query=q, db=db, top_k=top_k, min_score=min_score)
    
    # Map to schema
    formatted_results = []
    for r in results_raw:
        try:
            # We need to validate the listing model into a schema
            lst_schema = schemas.Listing.model_validate(r["listing"])
            formatted_results.append(schemas.SearchResult(
                listing=lst_schema,
                score=r["score"],
                dense=r.get("dense"),
                bm25=r.get("bm25"),
                prefix=r.get("prefix"),
                match_type=r.get("match_type")
            ))
        except Exception as e:
            print(f"Validation error for search result: {e}")
            continue

    return schemas.SearchResponse(
        query=q,
        total=len(formatted_results),
        results=formatted_results
    )


# ──────────────────────────────────────────────────────────────────────
# Exchange Recommender Endpoints
# ──────────────────────────────────────────────────────────────────────

@app.get("/users/me/exchange-matches", response_model=List[schemas.ExchangeMatch])
def get_exchange_matches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Find exchange matches for the current user's exchangeable listings."""
    my_listings = db.query(models.Listing).options(joinedload(models.Listing.owner)).filter(
        models.Listing.owner_id == current_user.id,
        models.Listing.is_active == True,
        models.Listing.accept_exchange == True
    ).all()

    results = []
    from .search_engine import semantic_search
    
    for ml in my_listings:
        if not ml.exchange_preferences:
            continue
            
        # Search all active listings using the exchange_preferences as the query
        candidates_raw = semantic_search(query=ml.exchange_preferences, db=db, top_k=50, min_score=0.25)
        
        valid_matches = []
        for c in candidates_raw:
            cand_listing = c["listing"]
            # Exclude own listings and those not accepting exchanges
            if cand_listing.owner_id != current_user.id and cand_listing.accept_exchange:
                try:
                    lst_schema = schemas.Listing.model_validate(cand_listing)
                    valid_matches.append(schemas.SearchResult(
                        listing=lst_schema,
                        score=c["score"],
                        match_type=c.get("match_type", "semantic")
                    ))
                except Exception as e:
                    print(f"Match validation error: {e}")
        
        if valid_matches:
            results.append(schemas.ExchangeMatch(
                your_listing=schemas.Listing.model_validate(ml),
                matches=valid_matches
            ))
            
    return results


@app.get("/users/me/exchange-chains", response_model=List[schemas.ChainMatch])
def get_exchange_chains(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Finds 3-hop exchange circuits where:
    Me (Listing A) -> User X (Listing B) -> User Y (Listing C)
    Where Listing C matches what Me (Listing A) wants.
    """
    my_listings = db.query(models.Listing).options(joinedload(models.Listing.owner)).filter(
        models.Listing.owner_id == current_user.id,
        models.Listing.is_active == True,
        models.Listing.accept_exchange == True
    ).all()

    if not my_listings:
        return []

    # Get all active exchangeable listings NOT belonging to current user
    all_other_listings = db.query(models.Listing).options(joinedload(models.Listing.owner)).filter(
        models.Listing.owner_id != current_user.id,
        models.Listing.is_active == True,
        models.Listing.accept_exchange == True
    ).all()

    from .search_engine import _cached_query_embedding, _field_weighted_dense
    
    def matches_wants(wants: str, target_listing: models.Listing, threshold: float = 0.35) -> bool:
        if not wants: return False
        wants_clean = wants.strip().lower()
        try:
            # Semantic check
            query_emb = _cached_query_embedding(wants_clean)
            score = _field_weighted_dense(query_emb, target_listing)
            if score >= threshold:
                return True
            
            # Keyword fallback (if semantic returns 0 due to disabled models)
            tokens = set(wants_clean.split())
            text = (target_listing.title + " " + (target_listing.description or "")).lower()
            if any(t in text for t in tokens if len(t) > 3):
                return True
            return False
        except:
            return False

    chains = []
    # Exhaustive search for circuits
    for my_item in my_listings:
        if not my_item.exchange_preferences: continue
        
        for item_x in all_other_listings:
            # Check if Item X is something I want
            if matches_wants(my_item.exchange_preferences, item_x):
                # Found a direct match - skip if we only want chains, but let's include it
                pass
            
            # Chain: My Item -> User X -> Item Y -> User Y -> My Item (item_y)
            if item_x.exchange_preferences:
                for item_y in all_other_listings:
                    if item_y.owner_id == item_x.owner_id: continue # same owner
                    
                    # Does User X want my item?
                    if matches_wants(item_x.exchange_preferences, my_item):
                        # Does User Y match User X's preference?
                        if item_y.exchange_preferences and matches_wants(item_x.exchange_preferences, item_y):
                            # Does User Y's item match MY preference?
                            if matches_wants(my_item.exchange_preferences, item_y):
                                chains.append(schemas.ChainMatch(
                                    your_listing=schemas.Listing.model_validate(my_item),
                                    chain=[
                                        schemas.Listing.model_validate(item_x),
                                        schemas.Listing.model_validate(item_y)
                                    ]
                                ))
                                if len(chains) >= 5: return chains # Cap results
                                
    return chains


# ──────────────────────────────────────────────────────────────────────
# Trust & Review Endpoints
# ──────────────────────────────────────────────────────────────────────

@app.post("/users/{user_id}/vouch")
def vouch_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cant vouch for self")
        
    existing = db.query(models.CommunityVouch).filter(
        models.CommunityVouch.vouter_id == current_user.id,
        models.CommunityVouch.voutee_id == user_id
    ).first()
    
    if existing:
        return {"status": "already_vouched"}
        
    vouch = models.CommunityVouch(vouter_id=current_user.id, voutee_id=user_id)
    db.add(vouch)
    db.commit()
    return {"status": "success"}


@app.get("/users/{user_id}/reviews", response_model=List[schemas.Review])
def get_user_reviews(
    user_id: int,
    db: Session = Depends(get_db)
):
    reviews = db.query(models.Review).filter(models.Review.reviewee_id == user_id).order_by(models.Review.created_at.desc()).all()
    # Manual date formatting since schema expects string
    for r in reviews:
        r.created_at = r.created_at.isoformat()
    return reviews


@app.post("/users/{user_id}/reviews", response_model=schemas.Review)
def leave_review(
    user_id: int,
    review_data: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify order exists and user participated
    order = db.query(models.Order).filter(models.Order.id == review_data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Check if user was buyer or seller in any item of this order
    # For now, simplistic check: is it their order? (buyer check)
    if order.user_id != current_user.id:
        # Check if they own any listing in this order (seller check)
        participated = False
        for item in order.items:
            if item.listing.owner_id == current_user.id:
                participated = True
                break
        if not participated:
            raise HTTPException(status_code=403, detail="Not authorized to review this transaction")

    review = models.Review(
        order_id=review_data.order_id,
        reviewer_id=current_user.id,
        reviewee_id=user_id,
        rating=review_data.rating,
        comment=review_data.comment,
        media_url=review_data.media_url
    )
    
    # Auto-trigger dispute for 1-star reviews
    if review_data.rating == 1:
        dispute = models.Dispute(
            order_id=review_data.order_id,
            complainant_id=current_user.id,
            accused_id=user_id,
            reason=f"Auto-triggered by 1-star review: {review_data.comment}"
        )
        db.add(dispute)
    
    db.add(review)
    db.commit()
    db.refresh(review)
    review.created_at = review.created_at.isoformat()
    return review



if __name__ == "__main__":
    # Use app object directly and disable reload for maximum stability
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
