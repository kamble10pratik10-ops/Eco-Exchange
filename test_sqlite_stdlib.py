import sqlite3
try:
    conn = sqlite3.connect("exox.db")
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables in DB: {tables}")
    conn.close()
except Exception as e:
    print(f"SQLite failed: {e}")
