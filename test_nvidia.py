import urllib.request
import urllib.error
import urllib.parse
import json
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv('MOONSHOT_API_KEY')

# Let's see if the key works with Nvidia's NVLM or Llama Vision
payload = {
  "model": "meta/llama-3.2-90b-vision-instruct",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What's in this image? Just say 'TEST'."},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="}}
      ]
    }
  ],
  "max_tokens": 10,
  "temperature": 0.1
}

req = urllib.request.Request(
    'https://integrate.api.nvidia.com/v1/chat/completions',
    data=json.dumps(payload).encode('utf-8'),
    headers={
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json'
    },
    method='POST'
)

try: 
    with urllib.request.urlopen(req) as resp:
        print("Success:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e: 
    print(f"HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Other Error: {e}")
