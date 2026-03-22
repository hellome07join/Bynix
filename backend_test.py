#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Bynix Trading Platform
Tests all backend endpoints in priority order:
1. Authentication endpoints
2. Trading endpoints  
3. Wallet endpoints
4. Assets endpoint
5. Admin endpoints
"""

import requests
import json
import time
import uuid
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8001/api"
# Use unique email for each test run
TEST_USER_EMAIL = f"trader{int(time.time())}@bynix.com"
TEST_USER_PASSWORD = "SecurePass123!"
TEST_USER_NAME = "Test Trader"

class BynixAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, use_auth: bool = False) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {"Content-Type": "application/json"}
        
        if headers:
            request_headers.update(headers)
            
        if use_auth and self.auth_token:
            request_headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=request_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=request_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=request_headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=request_headers)
            else:
                return False, f"Unsupported method: {method}", 400
                
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, str(e), 0

    # ============= AUTHENTICATION TESTS =============
    
    def test_signup(self):
        """Test user signup"""
        data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        }
        
        success, response, status_code = self.make_request("POST", "/auth/signup", data)
        
        if success and status_code == 200:
            if "user_id" in response and "otp" in response:
                self.user_id = response["user_id"]
                self.signup_otp = response["otp"]
                self.log_test("User Signup", True, f"User created with ID: {self.user_id}, OTP: {self.signup_otp}")
                return True
            else:
                self.log_test("User Signup", False, "Missing user_id or otp in response", response)
                return False
        else:
            self.log_test("User Signup", False, f"Status: {status_code}", response)
            return False

    def test_verify_otp(self):
        """Test OTP verification"""
        if not hasattr(self, 'signup_otp'):
            self.log_test("OTP Verification", False, "No OTP available from signup")
            return False
            
        data = {
            "email": TEST_USER_EMAIL,
            "otp": self.signup_otp
        }
        
        success, response, status_code = self.make_request("POST", "/auth/verify-otp", data)
        
        if success and status_code == 200:
            if "access_token" in response:
                self.auth_token = response["access_token"]
                self.log_test("OTP Verification", True, "Email verified and token received")
                return True
            else:
                self.log_test("OTP Verification", False, "No access_token in response", response)
                return False
        else:
            self.log_test("OTP Verification", False, f"Status: {status_code}", response)
            return False

    def test_login(self):
        """Test user login"""
        data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        success, response, status_code = self.make_request("POST", "/auth/login", data)
        
        if success and status_code == 200:
            if "access_token" in response and "user" in response:
                self.auth_token = response["access_token"]
                user_data = response["user"]
                self.log_test("User Login", True, f"Login successful for user: {user_data.get('name')}")
                return True
            else:
                self.log_test("User Login", False, "Missing access_token or user in response", response)
                return False
        else:
            self.log_test("User Login", False, f"Status: {status_code}", response)
            return False

    def test_get_me(self):
        """Test get current user info"""
        success, response, status_code = self.make_request("GET", "/auth/me", use_auth=True)
        
        if success and status_code == 200:
            if "user_id" in response and "email" in response:
                self.log_test("Get Current User", True, f"User info retrieved: {response.get('email')}")
                return True
            else:
                self.log_test("Get Current User", False, "Missing user info in response", response)
                return False
        else:
            self.log_test("Get Current User", False, f"Status: {status_code}", response)
            return False

    def test_auth_without_token(self):
        """Test protected endpoint without authentication"""
        success, response, status_code = self.make_request("GET", "/auth/me")
        
        if status_code == 401:
            self.log_test("Auth Protection", True, "Correctly rejected request without token")
            return True
        else:
            self.log_test("Auth Protection", False, f"Should return 401, got {status_code}", response)
            return False

    # ============= ASSETS TESTS =============
    
    def test_get_assets(self):
        """Test get tradeable assets"""
        success, response, status_code = self.make_request("GET", "/assets")
        
        if success and status_code == 200:
            if isinstance(response, list) and len(response) > 0:
                asset = response[0]
                if "asset_id" in asset and "symbol" in asset and "name" in asset:
                    self.log_test("Get Assets", True, f"Retrieved {len(response)} assets")
                    return True
                else:
                    self.log_test("Get Assets", False, "Invalid asset structure", response)
                    return False
            else:
                self.log_test("Get Assets", False, "No assets returned", response)
                return False
        else:
            self.log_test("Get Assets", False, f"Status: {status_code}", response)
            return False

    # ============= TRADING TESTS =============
    
    def test_create_trade(self):
        """Test creating a new trade"""
        data = {
            "asset": "BTC/USD",
            "trade_type": "call",
            "amount": 100.0,
            "duration": 300,  # 5 minutes
            "entry_price": 45000.0,
            "account_type": "demo"
        }
        
        success, response, status_code = self.make_request("POST", "/trades", data, use_auth=True)
        
        if success and status_code == 200:
            if "trade_id" in response:
                self.test_trade_id = response["trade_id"]
                self.log_test("Create Trade", True, f"Trade created with ID: {self.test_trade_id}")
                return True
            else:
                self.log_test("Create Trade", False, "No trade_id in response", response)
                return False
        else:
            self.log_test("Create Trade", False, f"Status: {status_code}", response)
            return False

    def test_get_trades(self):
        """Test getting user's trades"""
        success, response, status_code = self.make_request("GET", "/trades", use_auth=True)
        
        if success and status_code == 200:
            if isinstance(response, list):
                self.log_test("Get Trades", True, f"Retrieved {len(response)} trades")
                return True
            else:
                self.log_test("Get Trades", False, "Response is not a list", response)
                return False
        else:
            self.log_test("Get Trades", False, f"Status: {status_code}", response)
            return False

    def test_get_trade_stats(self):
        """Test getting trading statistics"""
        success, response, status_code = self.make_request("GET", "/trades/stats", use_auth=True)
        
        if success and status_code == 200:
            required_fields = ["total_trades", "won_trades", "lost_trades", "total_profit", "win_rate"]
            if all(field in response for field in required_fields):
                self.log_test("Get Trade Stats", True, f"Stats: {response}")
                return True
            else:
                self.log_test("Get Trade Stats", False, "Missing required fields in stats", response)
                return False
        else:
            self.log_test("Get Trade Stats", False, f"Status: {status_code}", response)
            return False

    def test_settle_trade(self):
        """Test settling a trade"""
        if not hasattr(self, 'test_trade_id'):
            self.log_test("Settle Trade", False, "No trade ID available")
            return False
            
        # Use POST with exit_price in body (not URL parameter)
        data = {"exit_price": 46000.0}
        success, response, status_code = self.make_request("POST", f"/trades/{self.test_trade_id}/settle", data, use_auth=True)
        
        if success and status_code == 200:
            if "status" in response and "profit_loss" in response:
                self.log_test("Settle Trade", True, f"Trade settled: {response}")
                return True
            else:
                self.log_test("Settle Trade", False, "Missing status or profit_loss in response", response)
                return False
        else:
            self.log_test("Settle Trade", False, f"Status: {status_code}", response)
            return False

    def test_insufficient_balance_trade(self):
        """Test creating trade with insufficient balance"""
        data = {
            "asset": "BTC/USD",
            "trade_type": "put",
            "amount": 50000.0,  # More than demo balance
            "duration": 300,
            "entry_price": 45000.0,
            "account_type": "demo"
        }
        
        success, response, status_code = self.make_request("POST", "/trades", data, use_auth=True)
        
        if status_code == 400 and "Insufficient balance" in str(response):
            self.log_test("Insufficient Balance Protection", True, "Correctly rejected trade with insufficient balance")
            return True
        else:
            self.log_test("Insufficient Balance Protection", False, f"Should return 400, got {status_code}", response)
            return False

    # ============= WALLET TESTS =============
    
    def test_request_deposit(self):
        """Test requesting a deposit"""
        data = {"amount": 500.0}
        
        success, response, status_code = self.make_request("POST", "/wallet/deposit", data, use_auth=True)
        
        if success and status_code == 200:
            if "transaction_id" in response and "crypto_address" in response:
                self.test_deposit_id = response["transaction_id"]
                self.log_test("Request Deposit", True, f"Deposit request created: {response['crypto_address']}")
                return True
            else:
                self.log_test("Request Deposit", False, "Missing transaction_id or crypto_address", response)
                return False
        else:
            self.log_test("Request Deposit", False, f"Status: {status_code}", response)
            return False

    def test_request_withdrawal_insufficient_balance(self):
        """Test requesting a withdrawal with insufficient balance (expected to fail)"""
        data = {
            "amount": 100.0,
            "crypto_address": "0x1234567890abcdef1234567890abcdef12345678"
        }
        
        success, response, status_code = self.make_request("POST", "/wallet/withdraw", data, use_auth=True)
        
        if status_code == 400 and "Insufficient balance" in str(response):
            self.log_test("Withdrawal Insufficient Balance Protection", True, "Correctly rejected withdrawal with insufficient balance")
            return True
        else:
            self.log_test("Withdrawal Insufficient Balance Protection", False, f"Should return 400, got {status_code}", response)
            return False

    def test_get_transactions(self):
        """Test getting transaction history"""
        success, response, status_code = self.make_request("GET", "/wallet/transactions", use_auth=True)
        
        if success and status_code == 200:
            if isinstance(response, list):
                self.log_test("Get Transactions", True, f"Retrieved {len(response)} transactions")
                return True
            else:
                self.log_test("Get Transactions", False, "Response is not a list", response)
                return False
        else:
            self.log_test("Get Transactions", False, f"Status: {status_code}", response)
            return False

    # ============= ADMIN TESTS =============
    
    def test_admin_endpoints_without_admin(self):
        """Test admin endpoints without admin privileges"""
        endpoints = ["/admin/users", "/admin/trades"]
        
        all_passed = True
        for endpoint in endpoints:
            success, response, status_code = self.make_request("GET", endpoint, use_auth=True)
            
            if status_code == 403:
                self.log_test(f"Admin Protection {endpoint}", True, "Correctly rejected non-admin user")
            else:
                self.log_test(f"Admin Protection {endpoint}", False, f"Should return 403, got {status_code}", response)
                all_passed = False
                
        return all_passed

    # ============= MAIN TEST RUNNER =============
    
    def run_all_tests(self):
        """Run all tests in priority order"""
        print("🚀 Starting Bynix Backend API Tests")
        print("=" * 50)
        
        # Priority 1: Authentication Flow
        print("\n📋 AUTHENTICATION TESTS")
        print("-" * 30)
        auth_tests = [
            self.test_signup,
            self.test_verify_otp,
            self.test_login,
            self.test_get_me,
            self.test_auth_without_token
        ]
        
        auth_passed = 0
        for test in auth_tests:
            if test():
                auth_passed += 1
        
        # Priority 2: Assets (needed for trading)
        print("\n📊 ASSETS TESTS")
        print("-" * 30)
        assets_passed = 1 if self.test_get_assets() else 0
        
        # Priority 3: Trading Flow
        print("\n💹 TRADING TESTS")
        print("-" * 30)
        trading_tests = [
            self.test_create_trade,
            self.test_get_trades,
            self.test_get_trade_stats,
            self.test_settle_trade,
            self.test_insufficient_balance_trade
        ]
        
        trading_passed = 0
        for test in trading_tests:
            if test():
                trading_passed += 1
        
        # Priority 4: Wallet Flow
        print("\n💰 WALLET TESTS")
        print("-" * 30)
        wallet_tests = [
            self.test_request_deposit,
            self.test_request_withdrawal_insufficient_balance,
            self.test_get_transactions
        ]
        
        wallet_passed = 0
        for test in wallet_tests:
            if test():
                wallet_passed += 1
        
        # Priority 5: Admin Protection
        print("\n🔐 ADMIN TESTS")
        print("-" * 30)
        admin_passed = 1 if self.test_admin_endpoints_without_admin() else 0
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Authentication: {auth_passed}/{len(auth_tests)} passed")
        print(f"Assets:         {assets_passed}/1 passed")
        print(f"Trading:        {trading_passed}/{len(trading_tests)} passed")
        print(f"Wallet:         {wallet_passed}/{len(wallet_tests)} passed")
        print(f"Admin:          {admin_passed}/1 passed")
        
        total_passed = auth_passed + assets_passed + trading_passed + wallet_passed + admin_passed
        total_tests = len(auth_tests) + 1 + len(trading_tests) + len(wallet_tests) + 1
        
        print(f"\nOVERALL: {total_passed}/{total_tests} tests passed")
        
        if total_passed == total_tests:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  Some tests failed - check details above")
            
        return total_passed == total_tests

if __name__ == "__main__":
    tester = BynixAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)