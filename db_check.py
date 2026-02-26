import sqlite3

def check_db():
    conn = sqlite3.connect("exox.db")
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables: {tables}")
    
    if ("conversations",) in tables:
        cursor.execute("SELECT * FROM conversations;")
        rows = cursor.fetchall()
        print(f"Conversations in DB: {rows}")
    else:
        print("conversations table not found!")

    if ("messages",) in tables:
        cursor.execute("SELECT * FROM messages;")
        rows = cursor.fetchall()
        print(f"Messages in DB: {rows}")
        
    conn.close()

if __name__ == "__main__":
    check_db()
