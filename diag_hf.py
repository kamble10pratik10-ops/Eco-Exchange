import requests
import os
import base64
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

# Test Image (a small transparent pixel or a real URL)
TEST_IMAGE_URL = "https://res.cloudinary.com/dsy0u40lh/image/upload/v1772185131/exo_exchange_listings/erzwj7cz3sknkx3r7plo.png"

# Stage 1: The Identity Router
VIT_ROUTER = "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"
# NEW ATTEMPT with router.huggingface.co
NEW_VIT_ROUTER = "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224"
EXPERT_ENGINE = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32"

def test_api():
    print(f"Token present: {bool(HF_TOKEN)}")
    print(f"Requesting image...")
    img_data = requests.get(TEST_IMAGE_URL).content
    
    # 1. Test ViT
    print("Testing ViT Router...")
    url = NEW_VIT_ROUTER # Updated URL
    res = requests.post(url, headers=HEADERS, data=img_data)
    print(f"ViT Status: {res.status_code}")
    print(f"ViT Response: {res.text[:200]}")
    
    # 2. Test CLIP
    print("\nTesting CLIP Expert...")
    url = "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32"
    img_b64 = base64.b64encode(img_data).decode('utf-8')
    # Try multiple formats
    payloads = [
        {"inputs": img_b64, "parameters": {"candidate_labels": ["phone", "clothing"]}},
        {"image": img_b64, "candidate_labels": ["phone", "clothing"]}
    ]
    
    for i, p in enumerate(payloads):
        print(f"Trying Payload Format {i+1}...")
        res = requests.post(url, headers=HEADERS, json=p)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:200]}")

if __name__ == "__main__":
    test_api()
