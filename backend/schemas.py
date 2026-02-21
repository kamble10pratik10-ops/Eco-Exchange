from pydantic import BaseModel, EmailStr
from typing import Optional, List


class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int

    class Config:
        from_attributes = True



class ListingBase(BaseModel):
    title: str
    description: str
    price: float
    category: Optional[str] = None
    city: Optional[str] = None


class ListingCreate(ListingBase):
    pass


class Listing(ListingBase):
    id: int
    is_active: bool
    owner_id: int

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


class TokenData(BaseModel):
    user_id: Optional[int] = None
