from pydantic import BaseModel, EmailStr
from typing import Optional, List


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


class ListingCreate(ListingBase):
    image_urls: List[str] = []


class Listing(ListingBase):
    id: int
    is_active: bool
    owner_id: int
    owner: Optional[UserPublic] = None
    images: List[ProductImage] = []

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
