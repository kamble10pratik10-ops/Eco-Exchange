import sqlite3
import json
import time

DB_PATH = "exox.db"

def final_demo_correction():
    print("[FIX] Correcting Demo Mapping based on actual images...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # THE CORRECT MAPPING ACCORDING TO USER:
    # OnePlus 13 (Fine/Scratches) -> 9.5 (Mint/High)
    # Redmi 12 (Not shattered) -> 7.2 (Scratches/Used)
    # Mobile (Medium Cracks) -> 4.2 (Moderate Damage)
    # Mobile 2 (Shattered AF) -> 1.2 (Smashed/Critical)

    demo_plan = [
        (20, 7.2, "AESTHETIC: Minor Scratches"), # Redmi 12
        (21, 9.5, "PREMIUM: Mint Condition"),     # OnePlus 13
        (22, 4.2, "MODERATE: Visible Cracks"),    # Mobile
        (23, 1.2, "CRITICAL: Fully Shattered")    # Mobile 2
    ]

    for lid, score, label in demo_plan:
        feedback = {
            "audit": "Corrected-Demo-Final",
            "condition": label,
            "timestamp": time.time()
        }
        cursor.execute(
            "UPDATE product_images SET quality_score = ?, ai_feedback = ? WHERE listing_id = ?",
            (score, json.dumps(feedback), lid)
        )
        print(f"  Fixed Listing {lid} -> {score}/10")

    conn.commit()
    conn.close()
    print("[FIX] Demo scores are now PERFECTLY ALIGNED with your photos.")

if __name__ == "__main__":
    final_demo_correction()
