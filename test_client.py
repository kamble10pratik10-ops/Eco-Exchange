import os
import json
from backend.ai_inspector import AIInspector
from backend.database import SessionLocal
from backend import models
from dotenv import load_dotenv

load_dotenv()

def manual_test():
    db = SessionLocal()
    image = db.query(models.ProductImage).filter(models.ProductImage.id >= 21).first()
    if not image:
        print("No image found to test.")
        return
    
    print(f"Testing manually for image {image.id}...")
    AIInspector.analyze_image(None, image.id)
    
    db.refresh(image)
    print(f"Resulting Score: {image.quality_score}")
    print(f"Feedback: {image.ai_feedback}")
    db.close()

if __name__ == "__main__":
    manual_test()
