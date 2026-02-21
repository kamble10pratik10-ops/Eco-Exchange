
import requests

def test_api():
    print("--- API DIAGNOSTIC TEST ---")
    url = "http://127.0.0.1:8000/search?q=mobile"
    print(f"Calling: {url}")
    try:
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print("Headers:", response.headers)
        print("Body:", response.text[:1000])
    except Exception as e:
        print(f"Request failed: {e}")

    print("\n--- HEALTH CHECK ---")
    try:
        response = requests.get("http://127.0.0.1:8000/health", timeout=5)
        print(f"Health Status: {response.status_code}")
        print("Health Body:", response.text)
    except Exception as e:
        print(f"Health failed: {e}")

if __name__ == "__main__":
    test_api()
