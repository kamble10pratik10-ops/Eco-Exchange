import urllib.request
import urllib.error
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv('MOONSHOT_API_KEY')

print(f"Testing Moonshot with Key: {key[:5]}...")

req = urllib.request.Request(
    'https://api.moonshot.cn/v1/models', 
    headers={'Authorization': f'Bearer {key}'}
)

try: 
    resp = urllib.request.urlopen(req)
    print("Success:", resp.read()[:200])
except urllib.error.HTTPError as e: 
    print(f"HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Other Error: {e}")
