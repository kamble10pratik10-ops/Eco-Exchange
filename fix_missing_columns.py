import sqlite3
import os

db_path = "exox.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add is_verified to users (just in case)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0")
        conn.commit()
        print("Successfully added is_verified column to users table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column is_verified already exists in users")
        else:
            print(f"Error adding is_verified: {e}")

    # 2. Add quality_score to product_images
    try:
        cursor.execute("ALTER TABLE product_images ADD COLUMN quality_score FLOAT")
        conn.commit()
        print("Successfully added quality_score column to product_images table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column quality_score already exists in product_images")
        else:
            print(f"Error adding quality_score: {e}")

    # 3. Add ai_feedback to product_images
    try:
        cursor.execute("ALTER TABLE product_images ADD COLUMN ai_feedback TEXT")
        conn.commit()
        print("Successfully added ai_feedback column to product_images table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column ai_feedback already exists in product_images")
        else:
            print(f"Error adding ai_feedback: {e}")

    conn.close()
else:
    print("Database not found")
