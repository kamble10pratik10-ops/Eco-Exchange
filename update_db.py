import sqlite3
import os

db_path = "exox.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE listings ADD COLUMN image_url TEXT")
        conn.commit()
        print("Successfully added image_url column to listings table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column image_url already exists")
        else:
            print(f"Error: {e}")
    conn.close()
else:
    print("Database not found")
