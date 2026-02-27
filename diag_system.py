import os
import requests
import json
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
IMG_URL = "https://res.cloudinary.com/dsy0u40lh/image/upload/v1772185131/exo_exchange_listings/erzwj7cz3sknkx3r7plo.png"
LABELS = ["mint condition", "shattered screen"]

def diagnose():
    print(f"Token: {HF_TOKEN[:5]}***")
    
    # Method 1: InferenceClient
    print("\n[Method 1] InferenceClient...")
    try:
        client = InferenceClient(token=HF_TOKEN)
        res = client.zero_shot_image_classification(
            image=IMG_URL,
            candidate_labels=LABELS,
            model="openai/clip-vit-base-patch32"
        )
        print(f"Success: {res}")
    except Exception as e:
        print(f"Fail: {e}")

    # Method 2: Direct Router URL
    print("\n[Method 2] Direct Router URL...")
    try:
        url = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32"
        payload = {"inputs": IMG_URL, "parameters": {"candidate_labels": LABELS}}
        res = requests.post(url, headers={"Authorization": f"Bearer {HF_TOKEN}"}, json=payload)
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text[:200]}")
    except Exception as e:
        print(f"Fail: {e}")

if __name__ == "__main__":
    diagnose()
