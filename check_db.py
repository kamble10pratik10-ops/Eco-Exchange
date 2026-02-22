import sqlite3
import os

db_path = "exox.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(listings)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"Column: {col[1]}")
    conn.close()
else:
    print("Database not found")
