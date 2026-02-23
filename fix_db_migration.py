import sqlite3
import os

db_path = "exox.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add is_verified to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0")
        conn.commit()
        print("Successfully added is_verified column to users table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column is_verified already exists")
        else:
            print(f"Error adding is_verified: {e}")

    conn.close()
else:
    print("Database not found")
