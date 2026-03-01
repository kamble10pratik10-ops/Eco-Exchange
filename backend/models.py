from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    followed_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    created_at = Column(Integer, nullable=False) # Unix timestamp


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    
    # Trust Metrics
    trust_score = Column(Float, default=5.0)
    successful_trades_count = Column(Integer, default=0)
    community_vouches_count = Column(Integer, default=0)
    has_active_disputes = Column(Boolean, default=False)

    listings = relationship("Listing", back_populates="owner")
    received_reviews = relationship("Review", back_populates="reviewee", foreign_keys="Review.reviewee_id")
    received_vouches = relationship("CommunityVouch", back_populates="voutee", foreign_keys="CommunityVouch.voutee_id")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")

    # Many-to-many self-referential relationship for following
    following = relationship(
        "User",
        secondary="follows",
        primaryjoin="User.id == Follow.follower_id",
        secondaryjoin="User.id == Follow.followed_id",
        backref="followers"
    )


class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    created_at = Column(Integer, nullable=False)  # Unix timestamp
    expires_at = Column(Integer, nullable=False)  # Unix timestamp


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String, index=True)
    city = Column(String, index=True)
    is_active = Column(Boolean, default=True)
    
    # Exchange System
    accept_exchange = Column(Boolean, default=True)
    exchange_preferences = Column(Text, nullable=True) # Description of what they want in return

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="listings")
    images = relationship("ProductImage", back_populates="listing", cascade="all, delete-orphan")
    wishlisted_by = relationship("WishlistItem", back_populates="listing", cascade="all, delete-orphan")
    ordered_items = relationship("OrderItem", back_populates="listing", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    
    # AI Verification Fields
    quality_score = Column(Float, nullable=True)
    ai_feedback = Column(Text, nullable=True) # JSON or descriptive text
    
    listing = relationship("Listing", back_populates="images")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    listing_id = Column(Integer, ForeignKey("listings.id"))

    user = relationship("User", back_populates="wishlist_items")
    listing = relationship("Listing", back_populates="wishlisted_by")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_amount = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, completed, cancelled

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    listing_id = Column(Integer, ForeignKey("listings.id"))
    price_at_order = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    listing = relationship("Listing", back_populates="ordered_items")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    reviewee_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer, nullable=False)  # 1-10
    comment = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="received_reviews")


class CommunityVouch(Base):
    __tablename__ = "community_vouches"

    id = Column(Integer, primary_key=True, index=True)
    vouter_id = Column(Integer, ForeignKey("users.id"))
    voutee_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    vouter = relationship("User", foreign_keys=[vouter_id])
    voutee = relationship("User", foreign_keys=[voutee_id], back_populates="received_vouches")


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    complainant_id = Column(Integer, ForeignKey("users.id"))
    accused_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="open")  # open, resolved, dismissed
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order")


