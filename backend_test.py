#!/usr/bin/env python3
"""
Backend Testing Script for TarsPay Integration
Tests TarsPay deposit functionality including channels, deposit creation, and validation
"""

import asyncio
import httpx
import json
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://bynix-markets.preview.emergentagent.com/api"

class TarsPayTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.auth_token = None
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: dict = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
    
    async def login_admin(self):
        """Login with admin credentials"""
        print("\n🔐 Testing Admin Login...")
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                # First, try to login with admin credentials
                login_data = {
                    "email": "admin@bynix.com",
                    "password": "admin123"
                }
                
                response = await client.post(f"{self.backend_url}/auth/login", json=login_data)
                
                if response.status_code == 200:
                    data = response.json()
                    # Check for both token formats
                    token = data.get("token") or data.get("access_token")
                    if token:
                        self.auth_token = token
                        user_info = data.get("user", {})
                        self.log_result("Admin Login", True, f"Successfully logged in as {user_info.get('email', 'admin')}")
                        return True
                    else:
                        self.log_result("Admin Login", False, f"Login failed: No token in response", data)
                        return False
                else:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"error": response.text}
                    self.log_result("Admin Login", False, f"HTTP {response.status_code}: {error_data.get('detail', error_data)}", error_data)
                    return False
                    
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    async def test_tarspay_channels(self):
        """Test GET /api/tarspay/channels endpoint"""
        print("\n📋 Testing TarsPay Channels...")
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(f"{self.backend_url}/tarspay/channels")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check response structure
                    if data.get("success") and "channels" in data:
                        channels = data["channels"]
                        
                        # Verify we have bKash and Nagad channels
                        channel_names = [ch.get("name", "").lower() for ch in channels]
                        has_bkash = any("bkash" in name for name in channel_names)
                        has_nagad = any("nagad" in name for name in channel_names)
                        
                        # Check minimum amounts ($10 = 1200 BDT)
                        min_amounts_correct = all(ch.get("min_usd", 0) == 10.0 for ch in channels)
                        
                        if has_bkash and has_nagad and min_amounts_correct:
                            self.log_result("TarsPay Channels", True, 
                                          f"Found {len(channels)} channels with correct $10 minimum", data)
                        else:
                            issues = []
                            if not has_bkash: issues.append("Missing bKash")
                            if not has_nagad: issues.append("Missing Nagad")
                            if not min_amounts_correct: issues.append("Incorrect minimum amounts")
                            self.log_result("TarsPay Channels", False, f"Issues: {', '.join(issues)}", data)
                    else:
                        self.log_result("TarsPay Channels", False, "Invalid response structure", data)
                else:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"error": response.text}
                    self.log_result("TarsPay Channels", False, f"HTTP {response.status_code}", error_data)
                    
        except Exception as e:
            self.log_result("TarsPay Channels", False, f"Exception: {str(e)}")
    
    async def test_tarspay_deposit_bkash(self):
        """Test POST /api/tarspay/deposit/create with bKash"""
        print("\n💳 Testing TarsPay Deposit (bKash)...")
        
        if not self.auth_token:
            self.log_result("TarsPay Deposit bKash", False, "No auth token available")
            return
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                deposit_data = {
                    "amount": 10,
                    "channel": "bkash",
                    "phone": "01711111111"
                }
                
                response = await client.post(
                    f"{self.backend_url}/tarspay/deposit/create",
                    json=deposit_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("success") and data.get("pay_url"):
                        self.log_result("TarsPay Deposit bKash", True, 
                                      f"Order created: {data.get('order_id')}, Amount: ${data.get('amount_usd')}", data)
                    else:
                        self.log_result("TarsPay Deposit bKash", False, 
                                      f"Failed: {data.get('error', 'Unknown error')}", data)
                else:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"error": response.text}
                    self.log_result("TarsPay Deposit bKash", False, f"HTTP {response.status_code}", error_data)
                    
        except Exception as e:
            self.log_result("TarsPay Deposit bKash", False, f"Exception: {str(e)}")
    
    async def test_tarspay_deposit_nagad(self):
        """Test POST /api/tarspay/deposit/create with Nagad"""
        print("\n💳 Testing TarsPay Deposit (Nagad)...")
        
        if not self.auth_token:
            self.log_result("TarsPay Deposit Nagad", False, "No auth token available")
            return
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                deposit_data = {
                    "amount": 15,
                    "channel": "nagad",
                    "phone": "01711111111"
                }
                
                response = await client.post(
                    f"{self.backend_url}/tarspay/deposit/create",
                    json=deposit_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("success") and data.get("pay_url"):
                        self.log_result("TarsPay Deposit Nagad", True, 
                                      f"Order created: {data.get('order_id')}, Amount: ${data.get('amount_usd')}", data)
                    else:
                        self.log_result("TarsPay Deposit Nagad", False, 
                                      f"Failed: {data.get('error', 'Unknown error')}", data)
                else:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"error": response.text}
                    self.log_result("TarsPay Deposit Nagad", False, f"HTTP {response.status_code}", error_data)
                    
        except Exception as e:
            self.log_result("TarsPay Deposit Nagad", False, f"Exception: {str(e)}")
    
    async def test_minimum_amount_validation(self):
        """Test minimum amount validation (below $10)"""
        print("\n⚠️  Testing Minimum Amount Validation...")
        
        if not self.auth_token:
            self.log_result("Minimum Amount Validation", False, "No auth token available")
            return
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                deposit_data = {
                    "amount": 5,  # Below $10 minimum
                    "channel": "bkash",
                    "phone": "01711111111"
                }
                
                response = await client.post(
                    f"{self.backend_url}/tarspay/deposit/create",
                    json=deposit_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Should fail with minimum amount error
                    if not data.get("success") and "minimum" in data.get("error", "").lower():
                        self.log_result("Minimum Amount Validation", True, 
                                      f"Correctly rejected: {data.get('error')}", data)
                    elif data.get("success"):
                        self.log_result("Minimum Amount Validation", False, 
                                      "Should have rejected amount below $10", data)
                    else:
                        self.log_result("Minimum Amount Validation", False, 
                                      f"Unexpected error: {data.get('error')}", data)
                else:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"error": response.text}
                    self.log_result("Minimum Amount Validation", False, f"HTTP {response.status_code}", error_data)
                    
        except Exception as e:
            self.log_result("Minimum Amount Validation", False, f"Exception: {str(e)}")
    
    async def test_authentication_required(self):
        """Test that authentication is required for deposit creation"""
        print("\n🔒 Testing Authentication Requirement...")
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                deposit_data = {
                    "amount": 10,
                    "channel": "bkash",
                    "phone": "01711111111"
                }
                
                # No Authorization header
                response = await client.post(
                    f"{self.backend_url}/tarspay/deposit/create",
                    json=deposit_data
                )
                
                if response.status_code == 401:
                    self.log_result("Authentication Required", True, "Correctly requires authentication")
                else:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"error": response.text}
                    self.log_result("Authentication Required", False, 
                                  f"Should return 401, got {response.status_code}", error_data)
                    
        except Exception as e:
            self.log_result("Authentication Required", False, f"Exception: {str(e)}")
    
    async def run_all_tests(self):
        """Run all TarsPay tests"""
        print("🚀 Starting TarsPay Integration Tests...")
        print(f"Backend URL: {self.backend_url}")
        
        # Test sequence
        await self.login_admin()
        await self.test_tarspay_channels()
        await self.test_authentication_required()
        await self.test_tarspay_deposit_bkash()
        await self.test_tarspay_deposit_nagad()
        await self.test_minimum_amount_validation()
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All TarsPay integration tests PASSED!")
        else:
            print("⚠️  Some tests FAILED - check details above")
        
        return passed == total

async def main():
    """Main test runner"""
    tester = TarsPayTester()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    asyncio.run(main())