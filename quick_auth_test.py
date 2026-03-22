#!/usr/bin/env python3
"""
Quick authentication test for Bynix trading platform
Creates a test user and returns auth token for frontend debugging
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://bynix-markets.preview.emergentagent.com/api"

def test_auth_flow():
    """Test the complete authentication flow and return token"""
    
    # Generate unique test user data
    timestamp = int(datetime.now().timestamp())
    test_email = f"trader{timestamp}@bynix.com"
    test_password = "TradingPass123!"
    test_name = f"Trader {timestamp}"
    
    print(f"🚀 Testing Bynix Authentication Flow")
    print(f"📧 Email: {test_email}")
    print(f"👤 Name: {test_name}")
    print("-" * 50)
    
    # Step 1: Signup
    print("1️⃣ Creating test user...")
    signup_data = {
        "email": test_email,
        "password": test_password,
        "name": test_name
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/signup", json=signup_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ❌ Signup failed: {response.text}")
            return None
            
        signup_result = response.json()
        print(f"   ✅ User created successfully")
        print(f"   📱 OTP: {signup_result.get('otp')}")
        
        otp = signup_result.get('otp')
        if not otp:
            print("   ❌ No OTP received")
            return None
            
    except Exception as e:
        print(f"   ❌ Signup error: {str(e)}")
        return None
    
    # Step 2: Verify OTP
    print("\n2️⃣ Verifying OTP...")
    verify_data = {
        "email": test_email,
        "otp": otp
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/verify-otp", json=verify_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ❌ OTP verification failed: {response.text}")
            return None
            
        verify_result = response.json()
        print(f"   ✅ OTP verified successfully")
        
        access_token = verify_result.get('access_token')
        if not access_token:
            print("   ❌ No access token received")
            return None
            
        print(f"   🔑 Access Token: {access_token[:20]}...")
        
    except Exception as e:
        print(f"   ❌ OTP verification error: {str(e)}")
        return None
    
    # Step 3: Test token with /auth/me
    print("\n3️⃣ Testing token with /auth/me...")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ❌ Token test failed: {response.text}")
            return None
            
        user_info = response.json()
        print(f"   ✅ Token is valid")
        print(f"   👤 User ID: {user_info.get('user_id')}")
        print(f"   💰 Demo Balance: ${user_info.get('demo_balance', 0):,.2f}")
        print(f"   💵 Real Balance: ${user_info.get('real_balance', 0):,.2f}")
        
    except Exception as e:
        print(f"   ❌ Token test error: {str(e)}")
        return None
    
    # Success - return all the info
    print("\n" + "=" * 50)
    print("🎉 AUTHENTICATION SUCCESSFUL!")
    print("=" * 50)
    print(f"📧 Email: {test_email}")
    print(f"🔑 Access Token: {access_token}")
    print(f"👤 User ID: {user_info.get('user_id')}")
    print("=" * 50)
    print("\n💡 Use this token in your frontend Authorization header:")
    print(f"   Authorization: Bearer {access_token}")
    print("\n🔗 Test with curl:")
    print(f'   curl -H "Authorization: Bearer {access_token}" {BACKEND_URL}/auth/me')
    
    return {
        "email": test_email,
        "password": test_password,
        "access_token": access_token,
        "user_id": user_info.get('user_id'),
        "user_info": user_info
    }

if __name__ == "__main__":
    result = test_auth_flow()
    if result:
        sys.exit(0)
    else:
        sys.exit(1)