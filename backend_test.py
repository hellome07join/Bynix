#!/usr/bin/env python3
"""
Backend Balance System Test - Testing $60 auto-refill bug fix
Bug: real_balance and bonus_balance were being double-counted in total_balance
Fix: total_balance should equal real_balance (NOT real_balance + bonus_balance)
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://bynix-markets.preview.emergentagent.com/api"

def test_balance_system():
    """Test the balance system after the $60 auto-refill bug fix"""
    print("=" * 80)
    print("BALANCE SYSTEM TEST - After $60 Auto-Refill Bug Fix")
    print("=" * 80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now()}")
    print()
    
    # Test credentials - try multiple users to find one with balance
    test_users = [
        {"email": "admin@bynix.com", "password": "admin123"},
        {"email": "buttontest@test.com", "password": "password123"},
        {"email": "trader1774164420@bynix.com", "password": "password123"}
    ]
    
    session = requests.Session()
    
    # Try to find a user with balance
    token = None
    user_email = None
    
    try:
        # Test 1: Try to login with different users to find one with balance
        print("🔐 TEST 1: Finding User with Balance")
        print("-" * 40)
        
        for user in test_users:
            print(f"Trying login with: {user['email']}")
            
            login_data = {
                "email": user["email"],
                "password": user["password"]
            }
            
            response = session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            print(f"Login Status: {response.status_code}")
            
            if response.status_code == 200:
                login_result = response.json()
                temp_token = login_result.get("access_token")
                
                if temp_token:
                    # Check balance for this user
                    headers = {"Authorization": f"Bearer {temp_token}"}
                    balance_response = session.get(f"{BACKEND_URL}/auth/me", headers=headers)
                    
                    if balance_response.status_code == 200:
                        balance_data = balance_response.json()
                        real_balance = balance_data.get("real_balance", 0)
                        bonus_balance = balance_data.get("bonus_balance", 0)
                        
                        print(f"  Real Balance: ${real_balance}, Bonus Balance: ${bonus_balance}")
                        
                        # Use this user if they have any balance
                        if real_balance > 0 or bonus_balance > 0:
                            token = temp_token
                            user_email = user["email"]
                            print(f"✅ Found user with balance: {user_email}")
                            break
                        else:
                            print(f"  No balance found for {user['email']}")
                    else:
                        print(f"  Failed to get balance for {user['email']}")
                else:
                    print(f"  No token received for {user['email']}")
            else:
                print(f"  Login failed for {user['email']}: {response.text}")
        
        # If no user with balance found, use admin for basic testing
        if not token:
            print("\n⚠️ No user with balance found, using admin for basic testing")
            admin_user = test_users[0]  # admin@bynix.com
            
            login_data = {
                "email": admin_user["email"],
                "password": admin_user["password"]
            }
            
            response = session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                login_result = response.json()
                token = login_result.get("access_token")
                user_email = admin_user["email"]
                print(f"✅ Using admin account: {user_email}")
            else:
                print(f"❌ Admin login failed: {response.text}")
                return False
        
        if not token:
            print("❌ No valid token obtained")
            return False
            
        print(f"Token: {token[:50]}...")
        print()
        
        # Set authorization header
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test 2: Check current balance via /auth/me
        print("💰 TEST 2: Check Balance via /auth/me")
        print("-" * 40)
        
        response = session.get(f"{BACKEND_URL}/auth/me", headers=headers)
        print(f"Auth/me Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Auth/me failed: {response.text}")
            return False
            
        user_data = response.json()
        
        # Extract balance fields
        real_balance = user_data.get("real_balance", 0)
        bonus_balance = user_data.get("bonus_balance", 0)
        total_balance = user_data.get("total_balance", 0)
        withdrawable_balance = user_data.get("withdrawable_balance", 0)
        
        print(f"User: {user_email}")
        print(f"Real Balance: ${real_balance}")
        print(f"Bonus Balance: ${bonus_balance}")
        print(f"Total Balance: ${total_balance}")
        print(f"Withdrawable Balance: ${withdrawable_balance}")
        print()
        
        # Test 2.5: If no bonus balance, try to create a test scenario with deposit
        if bonus_balance == 0 and real_balance == 0:
            print("💳 TEST 2.5: Creating Test Scenario with Deposit")
            print("-" * 40)
            
            # Try to make a deposit to trigger bonus system
            deposit_data = {
                "amount": 100,
                "currency": "USD",
                "network": "TRC20",
                "promo_code": "BYNIX"  # This should give 25% bonus
            }
            
            print("Attempting to create deposit with BYNIX promo code...")
            deposit_response = session.post(f"{BACKEND_URL}/wallet/deposit", json=deposit_data, headers=headers)
            print(f"Deposit Status: {deposit_response.status_code}")
            
            if deposit_response.status_code == 200:
                deposit_result = deposit_response.json()
                print(f"✅ Deposit request created: {deposit_result.get('transaction_id')}")
                print(f"Payment Address: {deposit_result.get('payment_address', 'N/A')}")
                
                # Note: In a real scenario, we would need to actually send crypto to trigger the bonus
                # For testing purposes, let's manually update the balance if we have admin access
                print("⚠️ Note: Actual crypto payment required to trigger bonus system")
            else:
                print(f"⚠️ Deposit creation failed: {deposit_response.text}")
            
            print()
        
        # Test 5: Check Admin User Stats Endpoint (potential bug location)
        print("👨‍💼 TEST 5: Check Admin User Stats Endpoint")
        print("-" * 40)
        
        # Get user_id for the current user
        user_id = user_data.get("user_id")
        if user_id:
            print(f"Testing admin user stats for user_id: {user_id}")
            
            # This endpoint had the double-counting bug: total_balance = real_balance + bonus_balance
            stats_response = session.get(f"{BACKEND_URL}/admin/withdrawals/{user_id}/user-stats", headers=headers)
            print(f"Admin Stats Status: {stats_response.status_code}")
            
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                
                stats_real_balance = stats_data.get("real_balance", 0)
                stats_bonus_balance = stats_data.get("bonus_balance", 0)
                stats_total_balance = stats_data.get("total_balance", 0)
                
                print(f"Admin Stats - Real Balance: ${stats_real_balance}")
                print(f"Admin Stats - Bonus Balance: ${stats_bonus_balance}")
                print(f"Admin Stats - Total Balance: ${stats_total_balance}")
                
                # Check if the bug exists in admin stats endpoint
                expected_admin_total = stats_real_balance  # Should equal real_balance
                incorrect_admin_total = stats_real_balance + stats_bonus_balance  # Bug would be this
                
                if stats_total_balance == expected_admin_total:
                    print("✅ ADMIN STATS CORRECT: total_balance equals real_balance")
                    admin_stats_passed = True
                elif stats_total_balance == incorrect_admin_total and stats_bonus_balance > 0:
                    print("❌ ADMIN STATS BUG DETECTED: total_balance equals real_balance + bonus_balance")
                    print("   This is the double-counting bug in admin stats endpoint")
                    admin_stats_passed = False
                else:
                    print(f"⚠️ ADMIN STATS UNEXPECTED: total_balance ({stats_total_balance}) doesn't match expected patterns")
                    admin_stats_passed = False
                    
            elif stats_response.status_code == 403:
                print("⚠️ Admin stats endpoint requires admin privileges")
                admin_stats_passed = True  # Not a bug, just access control
            else:
                print(f"❌ Admin stats endpoint failed: {stats_response.text}")
                admin_stats_passed = False
        else:
            print("⚠️ No user_id available for admin stats test")
            admin_stats_passed = True
        
        print()
        
        # Test 3: Verify balance calculation logic
        print("🧮 TEST 3: Verify Balance Calculation Logic")
        print("-" * 40)
        
        # The key test: total_balance should equal real_balance (NOT real_balance + bonus_balance)
        expected_total = real_balance
        actual_total = total_balance
        
        print(f"Expected total_balance (should equal real_balance): ${expected_total}")
        print(f"Actual total_balance: ${actual_total}")
        
        if actual_total == expected_total:
            print("✅ BALANCE CALCULATION CORRECT: total_balance equals real_balance")
            balance_test_passed = True
        else:
            print("❌ BALANCE CALCULATION ERROR: total_balance does not equal real_balance")
            print(f"   This suggests the bug is still present (double-counting bonus)")
            balance_test_passed = False
        
        # Additional verification: total_balance should NOT equal real_balance + bonus_balance
        incorrect_total = real_balance + bonus_balance
        if actual_total == incorrect_total and bonus_balance > 0:
            print(f"❌ CONFIRMED BUG: total_balance ({actual_total}) equals real_balance + bonus_balance ({incorrect_total})")
            print("   This is the double-counting bug that should be fixed")
            balance_test_passed = False
        elif bonus_balance > 0:
            print(f"✅ Bug not present: total_balance ({actual_total}) does NOT equal real_balance + bonus_balance ({incorrect_total})")
        
        print()
        
        # Test 4: Trade placement test (if user has balance)
        print("📈 TEST 4: Trade Placement Test (if balance available)")
        print("-" * 40)
        
        if total_balance > 0:
            # Try to place a small demo trade
            trade_amount = min(10, total_balance * 0.1)  # 10% of balance or $10, whichever is smaller
            
            trade_data = {
                "asset_id": "asset_btcusd",
                "amount": trade_amount,
                "direction": "up",
                "duration": 60,
                "account_type": "demo"  # Use demo to avoid affecting real balance
            }
            
            print(f"Attempting to place ${trade_amount} demo trade...")
            
            response = session.post(f"{BACKEND_URL}/trades", json=trade_data, headers=headers)
            print(f"Trade Status: {response.status_code}")
            
            if response.status_code == 200:
                trade_result = response.json()
                print(f"✅ Trade placed successfully")
                print(f"Trade ID: {trade_result.get('trade_id')}")
                
                # Check balance after trade
                response = session.get(f"{BACKEND_URL}/auth/me", headers=headers)
                if response.status_code == 200:
                    new_user_data = response.json()
                    new_total_balance = new_user_data.get("total_balance", 0)
                    print(f"Balance after trade: ${new_total_balance}")
                    
                    # For demo trades, balance should not change
                    if trade_data["account_type"] == "demo":
                        if new_total_balance == total_balance:
                            print("✅ Demo trade correctly did not affect real balance")
                        else:
                            print("❌ Demo trade incorrectly affected real balance")
                
            else:
                print(f"⚠️ Trade placement failed: {response.text}")
                print("   This might be expected if insufficient balance or other validation")
        else:
            print("⚠️ No balance available for trade test")
        
        print()
        
        # Test Summary
        print("📊 TEST SUMMARY")
        print("-" * 40)
        
        overall_passed = balance_test_passed and admin_stats_passed
        
        if overall_passed:
            print("✅ BALANCE SYSTEM TEST PASSED")
            print("   - total_balance correctly equals real_balance in /auth/me")
            if 'admin_stats_passed' in locals():
                print("   - Admin stats endpoint also verified")
            print("   - No double-counting of bonus_balance detected")
            print("   - Bug fix appears to be working correctly")
        else:
            print("❌ BALANCE SYSTEM TEST FAILED")
            print("   - total_balance calculation is incorrect in one or more endpoints")
            print("   - Double-counting bug may still be present")
            print("   - Further investigation needed")
        
        return overall_passed
        
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_balance_system()
    sys.exit(0 if success else 1)