from backend.auth import create_access_token, SECRET_KEY, ALGORITHM
from jose import jwt
import time

def test_jwt():
    print(f"Secret: {SECRET_KEY}")
    payload = {"sub": "1", "exp": time.time() + 3600}
    try:
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        print(f"Token: {token}")
        
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Decoded: {decoded}")
        print("JWT TEST SUCCESS!")
    except Exception as e:
        print(f"JWT TEST FAILED: {e}")

if __name__ == "__main__":
    test_jwt()
