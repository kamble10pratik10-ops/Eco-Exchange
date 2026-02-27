import urllib.request
print("Attempting HTTPS download...")
try:
    with urllib.request.urlopen("https://www.google.com", timeout=10) as f:
        print(f"Success! Status: {f.status}")
except Exception as e:
    print(f"Failed: {e}")
