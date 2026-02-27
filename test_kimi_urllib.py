import os
import urllib.request
import json
import base64
from dotenv import load_dotenv

load_dotenv()

def test_moonshot():
    moonshot_key = os.getenv("MOONSHOT_API_KEY")
    if not moonshot_key:
        print("ERROR: MOONSHOT_API_KEY not found in environment!")
        return

    image_url = "https://images.unsplash.com/photo-1599950753725-ea5d8aba0d29"
    
    try:
        print(f"Downloading test image from {image_url}...")
        req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            img_data = response.read()
        img_b64 = base64.b64encode(img_data).decode('utf-8')
        
        print("Image downloaded. Sending to Moonshot API...")
        
        payload = {
            "model": "moonshot-v1-8k-vision-preview",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert product inspector. Analyze the provided image of a product and reply ONLY with one of the following exact words based on its condition: 'shattered', 'scratches', or 'mint'."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{img_b64}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.1,
            "max_tokens": 10
        }
        
        data = json.dumps(payload).encode('utf-8')
        api_req = urllib.request.Request(
            "https://api.moonshot.cn/v1/chat/completions",
            data=data,
            headers={
                "Authorization": f"Bearer {moonshot_key}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(api_req, timeout=30) as api_response:
            resp_data = api_response.read()
            resp_json = json.loads(resp_data.decode('utf-8'))
            vis_label = resp_json['choices'][0]['message']['content'].strip().lower()
            print(f"[SUCCESS] Moonshot Vision Result: {vis_label}")
            
    except urllib.error.HTTPError as e:
        print(f"[ERROR] API Response: {e.code} {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Exception occurred: {e}")

if __name__ == '__main__':
    test_moonshot()
