import sqlite3

def fix_db():
    conn = sqlite3.connect("exox.db")
    cursor = conn.cursor()
    
    # 1. Add columns to listings
    try:
        cursor.execute("ALTER TABLE listings ADD COLUMN accept_exchange BOOLEAN DEFAULT 1")
        print("Added accept_exchange to listings")
    except Exception as e:
        print(f"Listing column exists or failed: {e}")
        
    try:
        cursor.execute("ALTER TABLE listings ADD COLUMN exchange_preferences TEXT")
        print("Added exchange_preferences to listings")
    except Exception as e:
        print(f"Listing column exists or failed: {e}")

    # 2. Add columns to users
    user_cols = [
        ("trust_score", "FLOAT DEFAULT 5.0"),
        ("successful_trades_count", "INTEGER DEFAULT 0"),
        ("community_vouches_count", "INTEGER DEFAULT 0"),
        ("has_active_disputes", "BOOLEAN DEFAULT 0")
    ]
    for col, spec in user_cols:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {spec}")
            print(f"Added {col} to users")
        except Exception as e:
            print(f"User column {col} exists or failed: {e}")

    # 3. Create new tables
    tables = [
        """
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            reviewer_id INTEGER,
            reviewee_id INTEGER,
            rating INTEGER NOT NULL,
            comment TEXT,
            media_url TEXT,
            created_at DATETIME,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(reviewer_id) REFERENCES users(id),
            FOREIGN KEY(reviewee_id) REFERENCES users(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS community_vouches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vouter_id INTEGER,
            voutee_id INTEGER,
            created_at DATETIME,
            FOREIGN KEY(vouter_id) REFERENCES users(id),
            FOREIGN KEY(voutee_id) REFERENCES users(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS disputes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            complainant_id INTEGER,
            accused_id INTEGER,
            status TEXT DEFAULT 'open',
            reason TEXT,
            created_at DATETIME,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(complainant_id) REFERENCES users(id),
            FOREIGN KEY(accused_id) REFERENCES users(id)
        )
        """
    ]
    for sql in tables:
        try:
            cursor.execute(sql)
            print("Table created or exists")
        except Exception as e:
            print(f"Table creation failed: {e}")

    conn.commit()
    conn.close()
    print("DB Fix Complete!")

if __name__ == "__main__":
    fix_db()
