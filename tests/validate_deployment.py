"""
Deployment and Compatibility Verification Suite for UNLOS Vercel Serverless Architecture.
"""
import os
import re
import json
import sys

workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def test_json_files():
    print("Testing JSON files...")
    for filename in ["package.json", "vercel.json"]:
        filepath = os.path.join(workspace, filename)
        assert os.path.exists(filepath), f"{filename} does not exist"
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert isinstance(data, dict), f"{filename} is not a valid JSON object"
            print(f"  ✓ {filename} is valid JSON")

    # Check vercel.json configuration
    with open(os.path.join(workspace, "vercel.json"), "r", encoding="utf-8") as f:
        vj = json.load(f)
        assert vj.get("version") == 2, "vercel.json must have version 2"
        rewrites = vj.get("rewrites", [])
        has_api_rewrite = any(r.get("source") == "/api/(.*)" and r.get("destination") == "/api/index.js" for r in rewrites)
        assert has_api_rewrite, "vercel.json missing /api/(.*) -> /api/index.js rewrite"
        print("  ✓ vercel.json contains correct API rewrites")

    # Check package.json engines & dependencies
    with open(os.path.join(workspace, "package.json"), "r", encoding="utf-8") as f:
        pj = json.load(f)
        assert pj.get("engines", {}).get("node") == "22.x", "package.json node engine should be 22.x"
        assert "@libsql/client" in pj.get("dependencies", {}), "package.json should include @libsql/client"
        print("  ✓ package.json contains 22.x node engine and @libsql/client dependency")

def test_file_existence():
    print("Testing required files existence...")
    required = [
        "server.js",
        "api/index.js",
        "lib/store.js",
        "lib/courses.js",
        "scripts/migrate-to-turso.js",
        "public/index.html",
        "public/styles.css",
        "public/app.js",
        "public/favicon.svg",
        ".env.example",
        ".gitignore",
        "vercel.json"
    ]
    for rel in required:
        path = os.path.join(workspace, rel)
        assert os.path.exists(path), f"Missing required file: {rel}"
        print(f"  ✓ {rel} exists")

def test_serverless_entry_point():
    print("Testing serverless entry point api/index.js...")
    with open(os.path.join(workspace, "api", "index.js"), "r", encoding="utf-8") as f:
        content = f.read()
        assert "createHandler" in content, "api/index.js must import createHandler"
        assert "module.exports" in content, "api/index.js must export a handler"
        print("  ✓ api/index.js correctly exports serverless handler")

def test_server_adaptations():
    print("Testing server.js adaptations...")
    with open(os.path.join(workspace, "server.js"), "r", encoding="utf-8") as f:
        content = f.read()
        # 1. Body parsing pre-parsed check
        assert "req.body" in content, "server.js must check req.body"
        # 2. Forwarded host
        assert "x-forwarded-host" in content, "server.js must check x-forwarded-host"
        # 3. Forwarded for
        assert "x-forwarded-for" in content, "server.js must check x-forwarded-for"
        # 4. createHandler exported
        assert "createHandler" in content, "server.js must export createHandler"
        # 5. ensureReady
        assert "ensureReady" in content, "server.js must include ensureReady"
        # 6. /tmp notice or check
        assert "/api/health" in content, "server.js must retain /api/health"
        print("  ✓ server.js contains all mandatory serverless adaptations")

def test_store_adaptations():
    print("Testing lib/store.js adaptations...")
    with open(os.path.join(workspace, "lib", "store.js"), "r", encoding="utf-8") as f:
        content = f.read()
        assert "createTursoStore" in content, "lib/store.js must implement createTursoStore"
        assert "createSqliteStore" in content, "lib/store.js must implement createSqliteStore"
        assert "TURSO_DATABASE_URL" in content, "lib/store.js must reference TURSO_DATABASE_URL"
        assert "os.tmpdir()" in content, "lib/store.js must fallback to os.tmpdir()"
        assert "SCHEMA_SQL" in content, "lib/store.js must define SCHEMA_SQL"
        print("  ✓ lib/store.js implements dual Turso and SQLite engines")

def test_endpoints_match_frontend():
    print("Testing API endpoints consistency between server.js and public/app.js...")
    with open(os.path.join(workspace, "server.js"), "r", encoding="utf-8") as f:
        server_code = f.read()
    with open(os.path.join(workspace, "public", "app.js"), "r", encoding="utf-8") as f:
        app_code = f.read()

    # Find API paths in app.js
    api_calls = set(re.findall(r"['\"](/api/[^'\"]+)['\"]", app_code))
    for call in api_calls:
        # Simplify path template if any
        base = call.split('/')[2] # e.g. 'courses', 'auth', 'me', 'dashboard', 'lessons', 'admin', 'account'
        assert f"/api/{base}" in server_code or f"'/api/{base}'" in server_code or f"\"/api/{base}\"" in server_code or f"/api/{base}/" in server_code, f"Endpoint {call} might not be handled in server.js"
        print(f"  ✓ Frontend route prefix /api/{base} verified in server.js")

def run_all():
    print("==================================================")
    print("UNLOS VERCEL COMPATIBILITY VERIFICATION SUITE")
    print("==================================================")
    test_file_existence()
    test_json_files()
    test_serverless_entry_point()
    test_server_adaptations()
    test_store_adaptations()
    test_endpoints_match_frontend()
    print("==================================================")
    print("ALL ARCHITECTURAL & CONFIGURATION CHECKS PASSED ✅")
    print("==================================================")

if __name__ == "__main__":
    run_all()
