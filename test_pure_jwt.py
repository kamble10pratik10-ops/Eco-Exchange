import hmac
import hashlib
import base64
import json
import time

SECRET_KEY = "CHANGE_ME_IN_PRODUCTION"
ALGORITHM = "HS256"

def base64url_encode(input_bytes):
    return base64.urlsafe_b64encode(input_bytes).decode('utf-8').replace('=', '')

def create_pure_jwt(data):
    header = {"alg": ALGORITHM, "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(data).encode('utf-8'))
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    sig_b64 = base64url_encode(sig)
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_pure_jwt(token):
    parts = token.split('.')
    if len(parts) != 3:
         print("Parts != 3")
         return False
    header_b64, payload_b64, signature_b64 = parts
    
    def base64url_decode(input_str):
        rem = len(input_str) % 4
        if rem > 0:
            input_str += '=' * (4 - rem)
        return base64.urlsafe_b64decode(input_str)
        
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    actual_sig = base64url_decode(signature_b64)
    if not hmac.compare_digest(expected_sig, actual_sig):
        print("Signature mismatch")
        return False
        
    payload = json.loads(base64url_decode(payload_b64))
    print(f"Verified payload: {payload}")
    return True

if __name__ == "__main__":
    t = create_pure_jwt({"sub": "1", "exp": time.time() + 3600})
    print(f"Token: {t}")
    verify_pure_jwt(t)
