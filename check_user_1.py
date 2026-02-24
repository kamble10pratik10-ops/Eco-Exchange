import sqlite3

def check_db():
    conn = sqlite3.connect('exox.db')
    cursor = conn.cursor()
    
    print("--- Individual Listings for User 1 ---")
    cursor.execute("SELECT id, title, price, is_active FROM listings WHERE owner_id = 1")
    for row in cursor.fetchall():
        print(row)

    conn.close()

if __name__ == "__main__":
    check_db()
