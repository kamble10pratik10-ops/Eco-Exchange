import os
os.environ['KMP_DUPLICATE_LIB_OK']='True'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

print("Test Stage 1: Basic imports")
from backend import models, database, search_engine, schemas
print("Stage 1 OK")

print("Test Stage 2: FastAPI & Uvicorn")
from fastapi import FastAPI
import uvicorn
print("Stage 2 OK")

print("Test Stage 3: Auth libs")
import jose
from passlib.context import CryptContext
print("Stage 3 OK")

print("Test Stage 4: Cloudinary")
import cloudinary
import cloudinary.uploader
print("Stage 4 OK")

print("ALL STAGES OK - Environment is stable for imports")
