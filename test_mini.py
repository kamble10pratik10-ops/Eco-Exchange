print("Testing auth...", flush=True)

print("1: bcrypt", flush=True)
import bcrypt
print("ok", flush=True)

print("2: jose", flush=True)
import jose
print("ok", flush=True)

print("3: backend.auth", flush=True)
from backend import auth
print("ok", flush=True)
