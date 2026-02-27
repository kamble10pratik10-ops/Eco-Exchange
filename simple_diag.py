import requests

URL = "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"
URL2 = "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224"

print(f"Checking URL 1: {URL}")
r = requests.post(URL, data=b"test")
print(f"Status: {r.status_code}")
print(f"Text: {r.text[:50]}")

print(f"\nChecking URL 2: {r.url.replace('api-inference.huggingface.co', 'router.huggingface.co')}")
r = requests.post(URL2, data=b"test")
print(f"Status: {r.status_code}")
print(f"Text: {r.text[:50]}")
