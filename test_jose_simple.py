from jose import jwt
import time

SECRET_KEY = "CHANGE_ME_IN_PRODUCTION"
ALGORITHM = "HS256"

def test_jose():
    print("Testing jose library...")
    payload = {"sub": "1", "exp": time.time() + 3600}
    try:
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        print(f"Encoded token: {token}")
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Decoded payload: {decoded}")
        print("Success!")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_jose()
