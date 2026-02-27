import urllib.request
import json
import base64

def test_kimi():
    # Hardcoded key for testing to avoid env/dotenv issues
    api_key = "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"
    image_url = "https://images.unsplash.com/photo-1599950753725-ea5d8aba0d29"
    
    print(f"Testing KIMI with image: {image_url}")
    
    try:
        # 1. Download image
        print("Downloading image...")
        req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            img_data = response.read()
        img_b64 = base64.b64encode(img_data).decode('utf-8')
        
        # 2. Call Kimi API (model kimi-k2.5 as requested by user)
        print("Calling KIMI-K2.5 API...")
        payload = {
            "model": "kimi-k2.5",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert product inspector. Analyze the provided image of a product and reply ONLY with a single numeric score from 1.0 to 10.0. Do not include any other text."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Product: iPhone 13 Pro"
                        },
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
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(api_req, timeout=30) as api_response:
            resp_data = api_response.read()
            resp_json = json.loads(resp_data.decode('utf-8'))
            ai_reply = resp_json['choices'][0]['message']['content'].strip()
            print(f"[SUCCESS] AI Answer: {ai_reply}")
            
    except Exception as e:
        print(f"[FAILURE] Test failed: {str(e)}")

if __name__ == "__main__":
    test_kimi()
