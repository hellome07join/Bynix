#!/usr/bin/env python3

import requests
import json

BASE_URL = "https://bynix-markets.preview.emergentagent.com/api"

def create_test_users():
    """Create test users for all three terminals"""
    
    # 1. Create trader user
    print("Creating trader user...")
    trader_data = {
        "email": "buttontest@test.com",
        "password": "Test123!",
        "name": "Button Test User",
        "country": "US"
    }
    
    response = requests.post(f"{BASE_URL}/auth/signup", json=trader_data)
    if response.status_code == 200:
        print("✅ Trader user created successfully")
        # For testing, we'll skip OTP verification and directly verify
        # In a real scenario, you'd need to verify with OTP
    else:
        print(f"❌ Failed to create trader user: {response.text}")
    
    # 2. Create admin user (this might need to be done manually in the database)
    print("Creating admin user...")
    admin_data = {
        "email": "admin@bynix.com", 
        "password": "admin123",
        "name": "Admin User",
        "country": "US"
    }
    
    response = requests.post(f"{BASE_URL}/auth/signup", json=admin_data)
    if response.status_code == 200:
        print("✅ Admin user created successfully")
    else:
        print(f"❌ Failed to create admin user: {response.text}")
    
    # 3. Create affiliate user
    print("Creating affiliate user...")
    affiliate_data = {
        "email": "norib98167@smkanba.com",
        "password": "password123", 
        "name": "Super Affiliate",
        "telegram": "@superaffiliate"
    }
    
    response = requests.post(f"{BASE_URL}/affiliate/register", json=affiliate_data)
    if response.status_code == 200:
        print("✅ Affiliate user created successfully")
        result = response.json()
        print(f"Affiliate code: {result.get('affiliate_code')}")
    else:
        print(f"❌ Failed to create affiliate user: {response.text}")

if __name__ == "__main__":
    create_test_users()