import logging
import json
import time
import os
import traceback
import base64
import re
import urllib.request
import urllib.parse
from typing import Any
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AIInspector")

class AIInspector:
    """
    Direct LLM Grader using NVIDIA NIM Vision.
    Sends image and text directly to the model and extracts a strict 1.0 - 10.0 score.
    """

    @staticmethod
    def analyze_image(db_unreliable: Session, image_id: int):
        # We always create our own session to ensure thread safety
        db = SessionLocal()
        try:
            image_record = db.query(models.ProductImage).filter(models.ProductImage.id == image_id).first()
            if not image_record:
                return

            listing = image_record.listing
            if not listing:
                return

            image_url = image_record.url
            print(f"\n[AI-AUDIT] 🔒 ANALYZING: '{listing.title}' with NVIDIA Vision", flush=True)

            final_score = 7.0
            feedback_msg = "Unknown error"

            try:
                # Fetch image bytes using urllib
                print(f"[AI-AUDIT] Downloading image for NVIDIA: {image_url}", flush=True)
                img_req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(img_req, timeout=15) as img_resp:
                    img_data = img_resp.read()
                img_b64 = base64.b64encode(img_data).decode('utf-8')
                
                # We use the key already in .env but switch targeting to Nvidia
                moonshot_key = os.getenv("MOONSHOT_API_KEY", "").strip()
                if not moonshot_key:
                    print("[AI-AUDIT] ❌ ERROR: API_KEY not set", flush=True)
                    feedback_msg = "API Key Missing"
                    raise ValueError("API Key Missing")

                payload = {
                    "model": "meta/llama-3.2-11b-vision-instruct",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "You are a highly strict product condition grader. Evaluate purely visually for structural/cosmetic condition: 1) Scratches, scuffs. 2) Dents, bends. 3) Cracks, chips. 4) Stains, fading. 5) Rust, liquid damage. 6) Fabric tears, rips, holes. 7) STITCHED REPAIRS OR SEWN TEARS. IF YOU SEE ANY SEWN REPAIRS, VISIBLE STITCHES FIXING A RIP, TORN FABRIC, HOLES, OR SEVERE DAMAGE, the score MUST BE 4.0 OR LOWER. A torn or stitched/repaired shirt cannot score higher than 3.0 or 4.0. Minor signs of original wear score 7.0-8.0. Only a completely pristine, mint item can score a 9.0+. Base your score 100% on the visible damage pixels and NOTHING ELSE. Reply ONLY with a float score (1.0 to 10.0)."
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{img_b64}"
                                    }
                                }
                            ]
                        }
                    ],
                    "temperature": 0.1,
                    "max_tokens": 10
                }
                
                # Call Nvidia NIM API using urllib
                print("[AI-AUDIT] Sending to NVIDIA NIM...", flush=True)
                api_data = json.dumps(payload).encode('utf-8')
                api_req = urllib.request.Request(
                    "https://integrate.api.nvidia.com/v1/chat/completions",
                    data=api_data,
                    headers={
                        "Authorization": f"Bearer {moonshot_key}",
                        "Content-Type": "application/json"
                    },
                    method='POST'
                )
                
                with urllib.request.urlopen(api_req, timeout=120) as api_resp:
                    resp_data = json.loads(api_resp.read().decode('utf-8'))
                    ai_reply = resp_data['choices'][0]['message']['content'].strip()
                    print(f"[AI-AUDIT] NVIDIA Response: {ai_reply}", flush=True)
                    
                    match = re.search(r'([0-9]+(?:\.[0-9]+)?)', ai_reply)
                    if match:
                        parsed_score = float(match.group(1))
                        final_score = max(1.0, min(10.0, parsed_score))
                        feedback_msg = f"NVIDIA Score: {final_score}"
                    else:
                        feedback_msg = f"Non-numeric: {ai_reply}"
            except Exception as e:
                print(f"[AI-AUDIT] NVIDIA API Failed: {e}", flush=True)
                feedback_msg = f"API Error: {str(e)}"

            # --- SAVE RESULTS ---
            image_record.quality_score = float(round(final_score, 1))
            image_record.ai_feedback = json.dumps({
                "audit": "NVIDIA Vision Direct",
                "feedback": feedback_msg,
                "timestamp": time.time()
            })
            db.commit()
            print(f"[AI-AUDIT] ✅ FINAL SCORE: {final_score}/10\n", flush=True)

        except Exception as e:
            traceback.print_exc()
            if 'image_record' in locals() and image_record:
                AIInspector._set_fallback(db, image_record, "Logic Exception")
        finally:
            db.close()

    @staticmethod
    def _set_fallback(db: Session, record: Any, msg: str):
        try:
            record.quality_score = 7.0
            record.ai_feedback = json.dumps({"status": f"Pending: {msg}"})
            db.commit()
        except:
            pass
