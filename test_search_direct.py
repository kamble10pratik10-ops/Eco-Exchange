
import os
import sys

# Add current directory to path so we can find 'backend'
sys.path.append(os.getcwd())

from backend.database import SessionLocal
from backend.search_engine import semantic_search, preload_models
import threading
import time

def run_test():
    print("--- STARTING DIRECT SEARCH ENGINE TEST ---")
    db = SessionLocal()
    
    # Preload models first
    print("\n1. Preloading models...")
    preload_models()
    
    print("\n2. Executing search for 'mobile'...")
    try:
        results = semantic_search(query="mobile", db=db)
        print(f"\nSUCCESS! Found {len(results)} results.")
        for r in results:
            print(f" - {r['listing'].title} (Score: {r['score']})")
    except Exception as e:
        import traceback
        print("\n!!! SEARCH FAILED !!!")
        print(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
