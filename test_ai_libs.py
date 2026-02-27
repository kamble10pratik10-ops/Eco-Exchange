try:
    import torch
    import transformers
    import PIL.Image as Image
    print(f"Torch Version: {torch.__version__}")
    print(f"Transformers Version: {transformers.__version__}")
    print("SUCCESS: AI libraries are available.")
except Exception as e:
    print(f"FAILURE: {e}")
