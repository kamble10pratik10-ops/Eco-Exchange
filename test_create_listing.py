import urllib.request
import urllib.parse
import json

API_URL = "http://127.0.0.1:8000"

def test_login_and_create():
    # 1. Login
    data = urllib.parse.urlencode({"username": "test@example.com", "password": "password"}).encode('utf-8')
    req = urllib.request.Request(f"{API_URL}/auth/token", data=data)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            token = res_data.get("access_token")
            print(f"Logged in. Token: {token[:20]}...")
    except urllib.error.HTTPError as e:
        print(f"Login failed: {e.code} - {e.read().decode('utf-8')}")
        return

    # 2. Create Listing
    payload = {
        "title": "Test Listing",
        "description": "Test Desc",
        "price": 100.0,
        "category": "Electronics & Technology",
        "city": "Test",
        "image_urls": []
    }
    dumped = json.dumps(payload).encode('utf-8')
    req2 = urllib.request.Request(f"{API_URL}/listings", data=dumped, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }, method="POST")

    try:
        with urllib.request.urlopen(req2) as resp2:
            print("Listing Created!")
            print(resp2.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"Create listing failed: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Other error: {e}")

if __name__ == "__main__":
    test_login_and_create()
