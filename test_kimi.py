import os
import requests
import base64
from dotenv import load_dotenv

load_dotenv()

def test_moonshot():
    moonshot_key = os.getenv("MOONSHOT_API_KEY")
    if not moonshot_key:
        print("ERROR: MOONSHOT_API_KEY not found in environment!")
        return

    # A simple image URL (a stock image of a smartphone)
    image_url = "https://images.unsplash.com/photo-1599950753725-ea5d8aba0d29"
    
    try:
        print(f"Downloading test image from {image_url}...")
        img_data = requests.get(image_url, timeout=10).content
        img_b64 = base64.b64encode(img_data).decode('utf-8')
        
        print("Image downloaded. Sending to Moonshot API (kimi-k2.5 / moonshot-v1)...")
        
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
        
        response = requests.post(
            "https://api.moonshot.cn/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {moonshot_key}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            vis_label = data['choices'][0]['message']['content'].strip().lower()
            print(f"[SUCCESS] Moonshot Vision Result: {vis_label}")
        else:
            print(f"[ERROR] API Response: {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {e}")

if __name__ == '__main__':
    test_moonshot()
