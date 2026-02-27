import sys
import os

# Add parent directory to path to allow relative imports if needed
sys.path.append(os.getcwd())

tests = [
    "import sqlalchemy",
    "import numpy",
    "import sentence_transformers",
    "import torch",
    "import pydantic",
    "import fastapi",
    "import uvicorn",
]

for t in tests:
    print(f"Testing: {t}...")
    try:
        exec(t)
        print(f"Success: {t}")
    except Exception as e:
        print(f"Fail: {t} -> {e}")
    except SystemExit:
        print(f"SystemExit during {t}")
    except:
        print(f"Unknown error during {t}")
    print("-" * 20)
