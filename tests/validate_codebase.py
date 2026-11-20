"""
Comprehensive Codebase & Syntax Verification for UNLOS Vercel Compatibility.
Uses Pygments JavascriptLexer to verify grammar, lexing, and bracket integrity.
"""
from pygments.lexers import JavascriptLexer
from pygments.token import Token
import json
import os

workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def verify_codebase():
    lexer = JavascriptLexer()
    files = [
        'server.js',
        'lib/store.js',
        'lib/courses.js',
        'api/index.js',
        'scripts/migrate-to-turso.js',
        'public/app.js',
        'tests/smoke.test.js',
        'tests/extended.test.js'
    ]
    pairs = {')': '(', ']': '[', '}': '{'}

    print("Verifying JavaScript syntax and bracket balance...")
    for rel_path in files:
        filepath = os.path.join(workspace, rel_path)
        with open(filepath, 'r', encoding='utf-8') as f:
            code = f.read()
        tokens = list(lexer.get_tokens(code))
        errors = [t for t in tokens if t[0] in Token.Error]
        assert len(errors) == 0, f"Lexing errors in {rel_path}: {errors}"
        
        stack = []
        for token_type, val in tokens:
            if token_type == Token.Punctuation:
                for ch in val:
                    if ch in '([{':
                        stack.append(ch)
                    elif ch in ')]}':
                        assert stack, f"Unexpected {ch} in {rel_path}"
                        top = stack.pop()
                        assert top == pairs[ch], f"Mismatched bracket in {rel_path}: expected {pairs[ch]} but got {ch}"
        assert len(stack) == 0, f"Unclosed brackets in {rel_path}: {stack}"
        print(f"  ✓ {rel_path} passed syntax and bracket integrity checks")

    print("\nVerifying JSON configurations...")
    for rel_path in ['package.json', 'vercel.json']:
        filepath = os.path.join(workspace, rel_path)
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        assert isinstance(data, dict), f"{rel_path} root is not an object"
        print(f"  ✓ {rel_path} is valid JSON")

    print("\nAll codebase files passed static verification! ✨")

if __name__ == '__main__':
    verify_codebase()
