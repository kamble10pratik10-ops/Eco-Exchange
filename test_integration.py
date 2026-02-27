import urllib.request
import urllib.parse
import json

API_URL = "http://127.0.0.1:8000"

def integration_test():
    email = "newuser_test123@example.com"
    pwd = "password123"
    
    # 1. Register
    print("Registering...")
    req_reg = urllib.request.Request(f"{API_URL}/auth/register", 
                                     data=json.dumps({"name": "Test", "email": email, "password": pwd, "phone": "123"}).encode(),
                                     headers={"Content-Type": "application/json"},
                                     method="POST")
    try:
        urllib.request.urlopen(req_reg)
    except urllib.error.HTTPError as e:
        if e.code != 400: # Ignore already registered
            print(f"Register error! {e.read()}")
            
    # 2. Login
    print("Logging in...")
    req_login = urllib.request.Request(f"{API_URL}/auth/token", 
                                         data=urllib.parse.urlencode({"username": email, "password": pwd}).encode())
    
    with urllib.request.urlopen(req_login) as resp:
           token = json.loads(resp.read().decode())["access_token"]
           print(f"Logged in! Token: {token[:15]}...")
           
    # 3. Create Listing
    print("Creating listing...")
    req_list = urllib.request.Request(f"{API_URL}/listings", 
                                     data=json.dumps({
                                         "title": "Integration Phone",
                                         "description": "Mint condition",
                                         "price": 500.0,
                                         "category": "Electronics & Technology",
                                         "city": "TestCity",
                                         "image_urls": ["https://images.unsplash.com/photo-1599950753725-ea5d8aba0d29"]
                                     }).encode(),
                                     headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                                     method="POST")
                                     
    with urllib.request.urlopen(req_list) as resp:
           listing = json.loads(resp.read().decode())
           print(f"SUCCESS! Listing ID created: {listing['id']}")
           
if __name__ == "__main__":
    integration_test()
