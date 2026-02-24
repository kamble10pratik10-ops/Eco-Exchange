import sqlite3

def check_db():
    conn = sqlite3.connect('exox.db')
    cursor = conn.cursor()
    
    print("--- User List ---")
    cursor.execute("SELECT id, name, email FROM users")
    for row in cursor.fetchall():
        print(row)

    print("--- Listing Summary per User ---")
    cursor.execute("""
        SELECT owner_id, count(*), sum(price) 
        FROM listings 
        GROUP BY owner_id
    """)
    for row in cursor.fetchall():
        print(row)

    print("--- Active Listing Summary per User ---")
    cursor.execute("""
        SELECT owner_id, count(*), sum(price) 
        FROM listings 
        WHERE is_active = 1
        GROUP BY owner_id
    """)
    for row in cursor.fetchall():
        print(row)

    conn.close()

if __name__ == "__main__":
    check_db()
