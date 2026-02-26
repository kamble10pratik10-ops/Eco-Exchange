import ast

with open('backend/chat_routes.py', 'r', encoding='utf-8') as f:
    source = f.read()

try:
    ast.parse(source)
    print("Syntax OK")
except SyntaxError as e:
    print(f"Syntax ERROR: {e}")
    print(f"Line: {e.lineno}")
    print(f"Offset: {e.offset}")
    print(f"Text: {e.text}")
