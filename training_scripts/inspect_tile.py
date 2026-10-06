import urllib.request
import urllib.error
import time

PYTHON_URL = "http://127.0.0.1:8000"

req = urllib.request.Request(f"{PYTHON_URL}/tiles/baseline/7/96/54.png")
try:
    with urllib.request.urlopen(req, timeout=10) as response:
        content = response.read()
        print(f"Status Code: {response.status}")
        print(f"Content Type: {response.headers.get('Content-Type')}")
        print(f"Length: {len(content)} bytes")
        
        # Save to disk to inspect
        with open("test_out.png", "wb") as f:
            f.write(content)
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
