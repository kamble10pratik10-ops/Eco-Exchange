import sqlite3

def upgrade_db():
    conn = sqlite3.connect('exox.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE listings ADD COLUMN accept_exchange BOOLEAN DEFAULT 0")
        print("Added accept_exchange column")
    except sqlite3.OperationalError as e:
        print(f"Error adding accept_exchange: {e}")

    try:
        cursor.execute("ALTER TABLE listings ADD COLUMN exchange_preferences TEXT DEFAULT NULL")
        print("Added exchange_preferences column")
    except sqlite3.OperationalError as e:
        print(f"Error adding exchange_preferences: {e}")

    conn.commit()
    conn.close()
    print("Database updated.")

if __name__ == '__main__':
    upgrade_db()
