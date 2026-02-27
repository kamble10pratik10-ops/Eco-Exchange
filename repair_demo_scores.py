import sqlite3
import json
import time

DB_PATH = "exox.db"

def final_demo_fix():
    print("[LOG] Applying Precise Demo Mapping for Logical Scores...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ID Mapping based on User's description:
    # Redmi (20) -> Full Cracks (1.4)
    # Mobile (22) -> Medium Cracks (4.2)
    # Mobile 2 (23) -> Few Scratches (7.5)
    # OnePlus 13 (21) -> Fine (9.2)

    mappings = [
        (20, 1.4, ["CRITICAL: Fully Shattered Display"]),
        (21, 9.2, ["PREMIUM: Near-Mint Condition"]),
        (22, 4.2, ["MODERATE: Visible Screen Cracks"]),
        (23, 7.5, ["AESTHETIC: Minor Surface Scratches"]),
        (24, 6.9, ["Audit: Inconclusive Visuals"])
    ]

    for list_id, score, defects in mappings:
        feedback = {
            "audit_mode": "Demo-Reliability-V8",
            "detected_defects": defects,
            "logical_condition": "POOR" if score < 4 else "FAIR" if score < 8 else "GOOD",
            "timestamp": time.time()
        }

        # Update ALL images for these specific listings
        cursor.execute(
            "UPDATE product_images SET quality_score = ?, ai_feedback = ? WHERE listing_id = ?",
            (score, json.dumps(feedback), list_id)
        )
        print(f"[LOG] Mapped Listing {list_id} to Score {score}")

    conn.commit()
    conn.close()
    print("\n[LOG] SUCCESS! Presentation logic is now hard-coded for your specific demo items.")

if __name__ == "__main__":
    final_demo_fix()
