import sqlite3

def check_db():
    conn = sqlite3.connect('exox.db')
    cursor = conn.cursor()
    
    # Check users
    cursor.execute("SELECT id, name FROM users")
    users = cursor.fetchall()
    print("Users:")
    for user in users:
        u_id, name = user
        cursor.execute("SELECT count(*), sum(price) FROM listings WHERE owner_id = ? AND is_active = 1", (u_id,))
        stats = cursor.fetchone()
        count, total_price = stats
        print(f"User ID: {u_id}, Name: {name}, Active Listings: {count}, Total Worth: {total_price}")
        
    conn.close()

if __name__ == "__main__":
    check_db()
