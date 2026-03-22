#!/usr/bin/env python3
"""
Quick verification of trade history response structure
"""

import requests
import json

BASE_URL = "https://bynix-markets.preview.emergentagent.com/api"
TEST_USER_EMAIL = "buttontest@test.com"
TEST_USER_PASSWORD = "password123"

# Login
login_data = {"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
token = login_response.json()["access_token"]

# Get trade history
headers = {"Authorization": f"Bearer {token}"}
history_response = requests.get(f"{BASE_URL}/trades/history", headers=headers)

print("Trade History Response:")
print("=" * 50)
print(f"Status Code: {history_response.status_code}")
print(f"Response Structure:")
data = history_response.json()
print(json.dumps(data, indent=2))

if "trades" in data and len(data["trades"]) > 0:
    print(f"\nFirst Trade Example:")
    print(json.dumps(data["trades"][0], indent=2))