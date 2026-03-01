from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any


class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    profile_image_url: Optional[str] = None


class UserPublic(UserBase):
    id: int

    class Config:
        from_attributes = True


class User(UserBase):
    id: int
    is_verified: bool
    followers_count: int = 0
    following_count: int = 0
    
    # Trust System Fields
    trust_score: float = 5.0
    successful_trades_count: int = 0
    community_vouches_count: int = 0
    has_active_disputes: bool = False
    listings: List["Listing"] = []
    received_reviews: List["Review"] = []

    class Config:
        from_attributes = True


class FollowStatus(BaseModel):
    is_following: bool


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str



class ProductImage(BaseModel):
    id: int
    url: str
    listing_id: int
    quality_score: Optional[float] = None
    ai_feedback: Optional[str] = None

    class Config:
        from_attributes = True


class ListingBase(BaseModel):
    title: str
    description: str
    price: float
    category: Optional[str] = None
    city: Optional[str] = None
    accept_exchange: bool = True
    exchange_preferences: Optional[str] = None


class ListingCreate(ListingBase):
    image_urls: List[str] = []


class Listing(ListingBase):
    id: int
    is_active: bool
    owner_id: int
    owner: Optional[UserPublic] = None
    images: List[ProductImage] = []
    accept_exchange: bool = True
    exchange_preferences: Optional[str] = None

    class Config:
        from_attributes = True


class SearchResult(BaseModel):
    listing: "Listing"
    score: float
    dense: Optional[float] = None
    bm25: Optional[float] = None
    prefix: Optional[float] = None
    match_type: Optional[str] = None

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List["SearchResult"]


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_verified: bool = True


class TokenData(BaseModel):
    user_id: Optional[int] = None


class WishlistItemBase(BaseModel):
    listing_id: int


class WishlistItem(WishlistItemBase):
    id: int
    user_id: int
    listing: Listing

    class Config:
        from_attributes = True


class OrderItem(BaseModel):
    id: int
    listing_id: int
    price_at_order: float
    listing: Listing

    class Config:
        from_attributes = True


class Order(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    items: List[OrderItem]

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    active_listings_count: int
    sold_listings_count: int
    total_followers: int
    total_following: int
    wishlist_count: int
    unread_messages_count: int
    total_listings_value: float
    recent_activity: List[dict] = []


# ── Trust & Community Schemas ──────────────────────────────────────────────

class ReviewCreate(BaseModel):
    order_id: int
    rating: int  # 1-10
    comment: Optional[str] = None
    media_url: Optional[str] = None

class Review(BaseModel):
    id: int
    order_id: int
    reviewer_id: int
    reviewee_id: int
    rating: int
    comment: Optional[str] = None
    media_url: Optional[str] = None
    created_at: Any
    order: Optional["Order"] = None

    class Config:
        from_attributes = True

class CommunityVouch(BaseModel):
    id: int
    vouter_id: int
    voutee_id: int
    created_at: str

    class Config:
        from_attributes = True

class Dispute(BaseModel):
    id: int
    order_id: int
    complainant_id: int
    accused_id: int
    status: str
    reason: str
    created_at: str

    class Config:
        from_attributes = True


# ── Exchange Recommender Schemas ───────────────────────────────────────────

class ExchangeMatch(BaseModel):
    your_listing: Listing
    matches: List[SearchResult]

class ChainMatch(BaseModel):
    your_listing: Listing
    chain: List[Listing]  # Me(A) -> X(B) -> Y(C) -- where C matches A's wants

