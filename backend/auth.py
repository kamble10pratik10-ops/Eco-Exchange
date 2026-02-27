from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import models
from .database import get_db

SECRET_KEY = "CHANGE_ME_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def base64url_encode(input_bytes):
    return base64.urlsafe_b64encode(input_bytes).decode('utf-8').replace('=', '')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire_dt = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    # JWT spec asks for numeric date (integer unix timestamp)
    to_encode.update({"exp": int(expire_dt.timestamp())})
    
    header = {"alg": ALGORITHM, "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(to_encode).encode('utf-8'))
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    sig_b64 = base64url_encode(sig)
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    user = get_user_by_email(db, email=email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


import hmac
import hashlib
import base64
import json
import time

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    print(f"--> [AUTH] Verifying token: {token[:15]}...")
    
    try:
        # PURE PYTHON JWT DECODE (To avoid broken native DLLs)
        parts = token.split('.')
        if len(parts) != 3:
            print("!!! [AUTH] Malformed token (parts != 3)")
            raise credentials_exception
            
        header_b64, payload_b64, signature_b64 = parts
        
        # 1. Verify Signature
        def base64url_decode(input):
            rem = len(input) % 4
            if rem > 0:
                input += '=' * (4 - rem)
            return base64.urlsafe_b64decode(input)

        def base64url_encode(input):
            return base64.urlsafe_b64encode(input).decode('utf-8').replace('=', '')

        # Re-calculate signature
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_sig = base64url_decode(signature_b64)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            print("!!! [AUTH] Signature mismatch")
            raise credentials_exception
            
        # 2. Decode Payload
        payload = json.loads(base64url_decode(payload_b64))
        
        # 3. Check Expiry
        if "exp" in payload and payload["exp"] < time.time():
            print(f"!!! [AUTH] Token expired at {payload['exp']}")
            raise credentials_exception
            
        user_id = int(payload.get("sub"))
        print(f"--> [AUTH] Token verified for User ID: {user_id}")

    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        try:
             open("auth_debug.log", "a").write(f"!!! [AUTH] Manual Decode Failed: {e}\n{err_msg}\n")
        except:
             pass
        print(f"!!! [AUTH] Manual Decode Failed: {e}\n{err_msg}")
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if user is None:
        print(f"!!! [AUTH] User {user_id} not found in DB")
        raise credentials_exception
    return user