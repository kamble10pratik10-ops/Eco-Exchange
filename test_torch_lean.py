import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

try:
    import torch
    print(f"Torch Version: {torch.__version__}")
    x = torch.rand(5, 3)
    print(x)
    print("SUCCESS: Torch initialized with 1 thread.")
except Exception as e:
    print(f"FAILURE: {e}")
