import inspect
from huggingface_hub import InferenceClient

client = InferenceClient()
sig = inspect.signature(client.zero_shot_image_classification)
print(f"Signature: {sig}")
for name, param in sig.parameters.items():
    print(f"Parameter: {name}, Kind: {param.kind}")
