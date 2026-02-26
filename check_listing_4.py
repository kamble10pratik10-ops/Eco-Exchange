import requests

def test_convo():
    token = input("Enter token: ") # I'll run it with a known token if I can find one
    # Or just use the health check to see if I can reach the server
    pass

if __name__ == "__main__":
    # check listing 4
    import sqlite3
    conn = sqlite3.connect("exox.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM listings WHERE id=4;")
    listing = cursor.fetchone()
    print(f"Listing 4 exists: {listing}")
    
    cursor.execute("SELECT id FROM conversations WHERE listing_id=4;")
    conv = cursor.fetchone()
    print(f"Conversation for Listing 4: {conv}")
    conn.close()
