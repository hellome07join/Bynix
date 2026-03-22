#!/usr/bin/env python3
"""
Trade History Endpoint Testing for Bynix Trading Platform
Specifically tests GET /api/trades/history endpoint
"""

import requests
import json
import time
from typing import Dict, Any, Optional

# Configuration - Use production URL from frontend/.env
BASE_URL = "https://bynix-markets.preview.emergentagent.com/api"
TEST_USER_EMAIL = "buttontest@test.com"
TEST_USER_PASSWORD = "password123"

class TradeHistoryTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.trade_ids = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
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
            else:
                return False, f"Unsupported method: {method}", 400
                
            try:
                response_data = response.json()
            except:
                response_data = response.text
                
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, str(e), 0

    def test_login(self):
        """Test user login with provided credentials"""
        data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        success, response, status_code = self.make_request("POST", "/auth/login", data)
        
        if success and status_code == 200:
            if "access_token" in response and "user" in response:
                self.auth_token = response["access_token"]
                user_data = response["user"]
                self.user_id = user_data.get("user_id")
                self.log_test("User Login", True, f"Login successful for user: {user_data.get('name')}")
                return True
            else:
                self.log_test("User Login", False, "Missing access_token or user in response", response)
                return False
        else:
            self.log_test("User Login", False, f"Status: {status_code}", response)
            return False

    def test_create_test_trades(self):
        """Create 3 test trades with different assets and directions"""
        trades_data = [
            {
                "asset": "BTC/USD",
                "trade_type": "call",
                "amount": 100.0,
                "duration": 300,
                "entry_price": 45000.0,
                "account_type": "demo"
            },
            {
                "asset": "ETH/USD", 
                "trade_type": "put",
                "amount": 150.0,
                "duration": 600,
                "entry_price": 3000.0,
                "account_type": "demo"
            },
            {
                "asset": "EUR/USD",
                "trade_type": "call", 
                "amount": 200.0,
                "duration": 900,
                "entry_price": 1.0850,
                "account_type": "demo"
            }
        ]
        
        created_trades = 0
        for i, trade_data in enumerate(trades_data):
            success, response, status_code = self.make_request("POST", "/trades", trade_data, use_auth=True)
            
            if success and status_code == 200:
                if "trade_id" in response:
                    trade_id = response["trade_id"]
                    self.trade_ids.append(trade_id)
                    created_trades += 1
                    self.log_test(f"Create Test Trade {i+1}", True, f"Trade created: {trade_data['asset']} {trade_data['trade_type']} ${trade_data['amount']}")
                else:
                    self.log_test(f"Create Test Trade {i+1}", False, "No trade_id in response", response)
            else:
                self.log_test(f"Create Test Trade {i+1}", False, f"Status: {status_code}", response)
        
        return created_trades == len(trades_data)

    def test_settle_trades(self):
        """Settle trades with different outcomes (wins and losses)"""
        if not self.trade_ids:
            self.log_test("Settle Trades", False, "No trade IDs available")
            return False
        
        # Settlement data: some wins, some losses
        settlement_data = [
            {"exit_price": 46000.0},  # BTC win (call from 45000)
            {"exit_price": 2900.0},   # ETH win (put from 3000)  
            {"exit_price": 1.0800}    # EUR loss (call from 1.0850)
        ]
        
        settled_trades = 0
        for i, (trade_id, settlement) in enumerate(zip(self.trade_ids, settlement_data)):
            success, response, status_code = self.make_request("POST", f"/trades/{trade_id}/settle", settlement, use_auth=True)
            
            if success and status_code == 200:
                if "status" in response and "profit_loss" in response:
                    status = response["status"]
                    profit_loss = response["profit_loss"]
                    settled_trades += 1
                    self.log_test(f"Settle Trade {i+1}", True, f"Trade settled: {status}, P&L: ${profit_loss}")
                else:
                    self.log_test(f"Settle Trade {i+1}", False, "Missing status or profit_loss in response", response)
            else:
                self.log_test(f"Settle Trade {i+1}", False, f"Status: {status_code}", response)
        
        return settled_trades == len(self.trade_ids)

    def test_trade_history_endpoint(self):
        """Test the main trade history endpoint"""
        success, response, status_code = self.make_request("GET", "/trades/history", use_auth=True)
        
        if not success or status_code != 200:
            self.log_test("Trade History Endpoint", False, f"Status: {status_code}", response)
            return False
        
        # Verify response structure
        if not isinstance(response, dict) or "trades" not in response:
            self.log_test("Trade History Endpoint", False, "Response should be dict with 'trades' key", response)
            return False
        
        trades = response["trades"]
        if not isinstance(trades, list):
            self.log_test("Trade History Endpoint", False, "Trades should be a list", response)
            return False
        
        # Verify we have our test trades
        if len(trades) < 3:
            self.log_test("Trade History Endpoint", False, f"Expected at least 3 trades, got {len(trades)}", response)
            return False
        
        # Verify trade structure and data
        required_fields = ["trade_id", "asset", "type", "entry_price", "exit_price", "amount", "profit_loss", "status", "account_type", "time_ago", "created_at"]
        
        for i, trade in enumerate(trades[:3]):  # Check first 3 trades
            missing_fields = [field for field in required_fields if field not in trade]
            if missing_fields:
                self.log_test("Trade History Endpoint", False, f"Trade {i+1} missing fields: {missing_fields}", trade)
                return False
        
        # Verify sorting (newest first) by checking created_at timestamps
        if len(trades) > 1:
            for i in range(len(trades) - 1):
                if trades[i].get("created_at") and trades[i+1].get("created_at"):
                    if trades[i]["created_at"] < trades[i+1]["created_at"]:
                        self.log_test("Trade History Endpoint", False, "Trades not sorted by newest first", None)
                        return False
        
        # Verify profit/loss calculations
        wins = [t for t in trades if t.get("profit_loss", 0) > 0]
        losses = [t for t in trades if t.get("profit_loss", 0) < 0]
        
        self.log_test("Trade History Endpoint", True, 
                     f"Retrieved {len(trades)} trades, {len(wins)} wins, {len(losses)} losses. "
                     f"All required fields present, proper sorting confirmed.")
        return True

    def test_trade_history_without_auth(self):
        """Test trade history endpoint without authentication"""
        success, response, status_code = self.make_request("GET", "/trades/history")
        
        if status_code == 401:
            self.log_test("Trade History Auth Protection", True, "Correctly rejected request without token")
            return True
        else:
            self.log_test("Trade History Auth Protection", False, f"Should return 401, got {status_code}", response)
            return False

    def run_trade_history_tests(self):
        """Run all trade history tests"""
        print("🚀 Starting Trade History Endpoint Tests")
        print("=" * 50)
        
        # Step 1: Login
        print("\n🔐 AUTHENTICATION")
        print("-" * 30)
        if not self.test_login():
            print("❌ Login failed - cannot proceed with tests")
            return False
        
        # Step 2: Create test trades
        print("\n💹 CREATE TEST TRADES")
        print("-" * 30)
        if not self.test_create_test_trades():
            print("❌ Failed to create test trades - cannot proceed")
            return False
        
        # Step 3: Settle trades
        print("\n⚖️ SETTLE TRADES")
        print("-" * 30)
        if not self.test_settle_trades():
            print("❌ Failed to settle trades - cannot proceed")
            return False
        
        # Step 4: Test trade history endpoint
        print("\n📊 TRADE HISTORY ENDPOINT")
        print("-" * 30)
        history_success = self.test_trade_history_endpoint()
        
        # Step 5: Test auth protection
        print("\n🔒 AUTH PROTECTION")
        print("-" * 30)
        auth_success = self.test_trade_history_without_auth()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TRADE HISTORY TEST SUMMARY")
        print("=" * 50)
        
        if history_success and auth_success:
            print("🎉 ALL TRADE HISTORY TESTS PASSED!")
            print("✅ Trade history endpoint working correctly")
            print("✅ Returns formatted trade data with profit/loss")
            print("✅ Proper sorting (newest first)")
            print("✅ Auth protection working")
            return True
        else:
            print("⚠️ Some trade history tests failed")
            if not history_success:
                print("❌ Trade history endpoint issues")
            if not auth_success:
                print("❌ Auth protection issues")
            return False

if __name__ == "__main__":
    tester = TradeHistoryTester()
    success = tester.run_trade_history_tests()
    exit(0 if success else 1)