from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)

    listings = relationship("Listing", back_populates="owner")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")


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

