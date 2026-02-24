
import os
import sys
import time

# Add current directory to path
sys.path.append(os.getcwd())

from backend.database import SessionLocal, engine
from backend import models

def test_follows():
    print("--- Testing Follow System ---")
    db = SessionLocal()
    try:
        # Ensure tables exist
        models.Base.metadata.create_all(bind=engine)
        
        # Get or create two users
        u1 = db.query(models.User).filter(models.User.email == "test1@example.com").first()
        if not u1:
            u1 = models.User(email="test1@example.com", name="Test User 1", hashed_password="pw")
            db.add(u1)
        
        u2 = db.query(models.User).filter(models.User.email == "test2@example.com").first()
        if not u2:
            u2 = models.User(email="test2@example.com", name="Test User 2", hashed_password="pw")
            db.add(u2)
            
        db.commit()
        db.refresh(u1)
        db.refresh(u2)
        
        print(f"User 1: {u1.name} (Followers: {len(u1.followers)})")
        print(f"User 2: {u2.name} (Followers: {len(u2.followers)})")
        
        # Follow u2 from u1
        print(f"\nUser 1 following User 2...")
        # Check if already following
        if u2 not in u1.following:
            follow = models.Follow(follower_id=u1.id, followed_id=u2.id, created_at=int(time.time()))
            db.add(follow)
            db.commit()
            db.refresh(u1)
            db.refresh(u2)
        
        print(f"User 1 following count: {len(u1.following)}")
        print(f"User 2 followers count: {len(u2.followers)}")
        
        # Unfollow
        print(f"\nUser 1 unfollowing User 2...")
        follow = db.query(models.Follow).filter(models.Follow.follower_id == u1.id, models.Follow.followed_id == u2.id).first()
        if follow:
            db.delete(follow)
            db.commit()
            db.refresh(u1)
            db.refresh(u2)
            
        print(f"User 1 following count: {len(u1.following)}")
        print(f"User 2 followers count: {len(u2.followers)}")
        
        print("\nSUCCESS: Follow logic works!")
        
    except Exception as e:
        import traceback
        print("\n!!! TEST FAILED !!!")
        print(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    test_follows()
