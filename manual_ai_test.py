import asyncio
import logging
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend.ai_inspector import AIInspector
from backend import models

logging.basicConfig(level=logging.INFO)

async def test_inspector():
    db = SessionLocal()
    # Find an image that hasn't been analyzed yet
    image = db.query(models.ProductImage).filter(models.ProductImage.quality_score == None).first()
    if not image:
        print("No unanalyzed images found.")
        return
    
    print(f"Testing analysis for image ID: {image.id}, URL: {image.url}")
    # Simulate background task call
    # Note: analyze_image is now synchronous (def) as per previous edit
    AIInspector.analyze_image(None, image.id)
    
    # Reload from DB
    db.refresh(image)
    print(f"Analysis Result: Score={image.quality_score}")
    print(f"Feedback: {image.ai_feedback}")
    db.close()

if __name__ == "__main__":
    import asyncio
    # If analyze_image was async, we'd await it. But it's sync.
    # But wait, ai_inspector.py has 'def analyze_image', so no need for loop.
    db = SessionLocal()
    image = db.query(models.ProductImage).filter(models.ProductImage.quality_score == None).first()
    if image:
        print(f"Starting test for image {image.id}")
        AIInspector.analyze_image(None, image.id)
        db.refresh(image)
        print(f"Finished. Score: {image.quality_score}")
    else:
        print("No image to test.")
    db.close()
