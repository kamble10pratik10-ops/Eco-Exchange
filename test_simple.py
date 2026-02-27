from fastapi import FastAPI
from sqlalchemy import create_engine
print("Imports successful!")
app = FastAPI()
@app.get("/")
def read_root():
    return {"Hello": "World"}
print("FastAPI app created!")
