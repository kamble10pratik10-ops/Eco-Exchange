import os
os.environ['KMP_DUPLICATE_LIB_OK']='True'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'

from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def read_root():
    print("Hit root!", flush=True)
    return {"Hello": "World"}

if __name__ == "__main__":
    print("Starting minimal API...", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=8000)
