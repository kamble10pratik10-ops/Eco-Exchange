
import http.client
import json

def test_url(path):
    print(f"\nTesting: {path}")
    try:
        conn = http.client.HTTPConnection("127.0.0.1", 8000, timeout=10)
        conn.request("GET", path)
        res = conn.getresponse()
        print(f"Status: {res.status}")
        print(f"Reason: {res.reason}")
        data = res.read()
        print(f"Body: {data.decode('utf-8')[:500]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("--- API DIAGNOSTIC (STDLIB) ---")
    test_url("/health")
    test_url("/search?q=mobile")
