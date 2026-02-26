import urllib.request
import urllib.error

def test_routes():
    base_url = "http://127.0.0.1:8000"
    endpoints = [
        "/health",
        "/listings",
        "/messages/conversations",
        "/chat/conversations"
    ]
    
    for ep in endpoints:
        try:
            with urllib.request.urlopen(base_url + ep) as response:
                print(f"GET {ep} -> {response.status}")
        except urllib.error.HTTPError as e:
            print(f"GET {ep} -> {e.code}")
        except Exception as e:
            print(f"GET {ep} -> FAILED: {e}")

if __name__ == "__main__":
    test_routes()
