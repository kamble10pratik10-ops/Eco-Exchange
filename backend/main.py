from fastapi import FastAPI, Depends, HTTPException, status
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
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.post("/listings", response_model=schemas.Listing, status_code=status.HTTP_201_CREATED)
def create_listing(
    payload: schemas.ListingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    print(f"--> API REQUEST: Creating listing '{payload.title}'", flush=True)
    try:
        data = payload.dict()
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

        data = payload.dict()
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


if __name__ == "__main__":
    # Use app object directly and disable reload for maximum stability
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="debug")
