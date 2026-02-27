from backend.database import SessionLocal
from backend.auth import create_access_token, get_current_user
from backend import models
from fastapi import HTTPException
import asyncio

async def test():
    db = SessionLocal()
    # Find an existing user
    user = db.query(models.User).first()
    if not user:
        print("No users in DB!")
        return
        
    print(f"Testing for user {user.id}")
    
    # Create token using the system's current create_access_token
    token = create_access_token({"sub": str(user.id)})
    print(f"Token: {token[:20]}...")
    
    # Verify using the system's current get_current_user
    try:
        current_user = await get_current_user(token, db)
        print(f"Success! Logged in as: {current_user.id}")
    except HTTPException as e:
        print(f"Failed HTTP! {e.status_code} - {e.detail}")
    except Exception as e:
        print(f"Failed general! {e}")
        
    db.close()

if __name__ == "__main__":
    asyncio.run(test())
