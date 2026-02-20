from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Message ───

class MessageCreate(BaseModel):
    content: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_public_id: Optional[str] = None


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_public_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True


# ─── Conversation ───

class ConversationCreate(BaseModel):
    listing_id: int


class UserMini(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        orm_mode = True


class ListingMini(BaseModel):
    id: int
    title: str
    price: float

    class Config:
        orm_mode = True


class ConversationOut(BaseModel):
    id: int
    listing_id: int
    buyer_id: int
    seller_id: int
    created_at: datetime
    updated_at: datetime
    buyer: UserMini
    seller: UserMini
    listing: ListingMini
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

    class Config:
        orm_mode = True


class ConversationDetail(BaseModel):
    id: int
    listing_id: int
    buyer_id: int
    seller_id: int
    created_at: datetime
    updated_at: datetime
    buyer: UserMini
    seller: UserMini
    listing: ListingMini
    messages: List[MessageOut] = []

    class Config:
        orm_mode = True
