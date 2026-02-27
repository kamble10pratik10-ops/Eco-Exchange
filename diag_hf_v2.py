import requests
import os
import base64
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

TEST_IMAGE_URL = "https://res.cloudinary.com/dsy0u40lh/image/upload/v1772185131/exo_exchange_listings/erzwj7cz3sknkx3r7plo.png"

def test_api():
    print(f"Token present: {bool(HF_TOKEN)}")
    img_data = requests.get(TEST_IMAGE_URL).content
    
    urls = [
        "https://api-inference.huggingface.co/models/google/vit-base-patch16-224",
        "https://router.huggingface.co/models/google/vit-base-patch16-224",
        "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224"
    ]
    
    for url in urls:
        print(f"\nTesting: {url}")
        try:
            res = requests.post(url, headers=HEADERS, data=img_data, timeout=10)
            print(f"Status: {res.status_code}")
            print(f"Response: {res.text[:100]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
