#!/usr/bin/env python3
"""
Backend API Testing Script for Bynix Trading Platform
Focus: Deposit Bonus System and Dual Balance Trading System Testing
"""

import requests
import json
import time
from datetime import datetime
import sys
import pymongo
from pymongo import MongoClient

# Configuration
BACKEND_URL = "https://bynix-markets.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

class BynixDepositBonusAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_email = None
        
        # MongoDB connection for direct balance manipulation
        try:
            self.mongo_client = MongoClient(MONGO_URL)
            self.db = self.mongo_client[DB_NAME]
            self.log("✅ Connected to MongoDB")
        except Exception as e:
            self.log(f"❌ Failed to connect to MongoDB: {str(e)}", "ERROR")
            self.mongo_client = None
            self.db = None
        
    def log(self, message, level="INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def create_test_user(self):
        """Create a fresh test user for deposit bonus testing"""
        self.log("Creating fresh test user for deposit bonus testing...")
        
        # Generate unique email
        timestamp = int(time.time())
        self.test_email = f"deposit_test_{timestamp}@bynix.com"
        
        # Create user
        signup_data = {
            "email": self.test_email,
            "password": "TestPassword123!",
            "name": "Deposit Test User"
        }
        
        try:
            response = self.session.post(f"{API_URL}/auth/signup", json=signup_data)
            if response.status_code == 200:
                data = response.json()
                self.user_id = data.get('user_id')
                self.log(f"✅ User created: {self.test_email}")
                self.log(f"User ID: {self.user_id}")
                self.log(f"OTP: {data.get('otp')}")
                
                # Verify OTP
                otp_data = {
                    "email": self.test_email,
                    "otp": data.get('otp')
                }
                
                otp_response = self.session.post(f"{API_URL}/auth/verify-otp", json=otp_data)
                if otp_response.status_code == 200:
                    otp_result = otp_response.json()
                    self.auth_token = otp_result.get('access_token')
                    self.log("✅ OTP verified, got auth token")
                    
                    # Set authorization header
                    self.session.headers.update({
                        'Authorization': f'Bearer {self.auth_token}'
                    })
                    
                    return True
                else:
                    self.log(f"❌ OTP verification failed: {otp_response.text}", "ERROR")
                    return False
            else:
                self.log(f"❌ User creation failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating test user: {str(e)}", "ERROR")
            return False
    
    def verify_initial_balance(self):
        """Verify user has real_balance: 0 and bonus_balance: 0 initially"""
        self.log("Testing initial user balance state...")
        
        try:
            response = self.session.get(f"{API_URL}/auth/me")
            if response.status_code == 200:
                data = response.json()
                real_balance = data.get('real_balance', 0)
                bonus_balance = data.get('bonus_balance', 0)
                total_balance = data.get('total_balance', 0)
                withdrawable_balance = data.get('withdrawable_balance', 0)
                
                self.log(f"Real Balance: ${real_balance}")
                self.log(f"Bonus Balance: ${bonus_balance}")
                self.log(f"Total Balance: ${total_balance}")
                self.log(f"Withdrawable Balance: ${withdrawable_balance}")
                
                if real_balance == 0 and bonus_balance == 0:
                    self.log("✅ Initial balance state correct (both balances are 0)")
                    return True
                else:
                    self.log(f"❌ Initial balance incorrect - Real: ${real_balance}, Bonus: ${bonus_balance}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to get user info: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error verifying initial balance: {str(e)}", "ERROR")
            return False
    
    def test_first_deposit_bonus_calculation(self):
        """Test first deposit 200% bonus calculation"""
        self.log("Testing first deposit 200% bonus calculation...")
        
        deposit_data = {
            "amount": 100,
            "network": "TRC20"
        }
        
        try:
            response = self.session.post(f"{API_URL}/deposit/create", json=deposit_data)
            self.log(f"Deposit Create Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Deposit request created successfully")
                
                # Verify bonus calculation
                bonus_percentage = data.get('bonus_percentage')
                bonus_amount = data.get('bonus_amount')
                total_credit = data.get('total_credit')
                is_first_deposit = data.get('is_first_deposit')
                
                self.log(f"Bonus Percentage: {bonus_percentage}%")
                self.log(f"Bonus Amount: ${bonus_amount}")
                self.log(f"Total Credit: ${total_credit}")
                self.log(f"Is First Deposit: {is_first_deposit}")
                
                # Verify calculations
                expected_bonus_percentage = 200
                expected_bonus_amount = 100 * (200 / 100)  # 200% of 100 = 200
                expected_total_credit = 100 + expected_bonus_amount  # 100 + 200 = 300
                
                if (bonus_percentage == expected_bonus_percentage and 
                    bonus_amount == expected_bonus_amount and 
                    total_credit == expected_total_credit and 
                    is_first_deposit == True):
                    self.log("✅ First deposit bonus calculation correct")
                    return True
                else:
                    self.log(f"❌ First deposit bonus calculation incorrect", "ERROR")
                    self.log(f"Expected: {expected_bonus_percentage}%, ${expected_bonus_amount}, ${expected_total_credit}, True", "ERROR")
                    self.log(f"Got: {bonus_percentage}%, ${bonus_amount}, ${total_credit}, {is_first_deposit}", "ERROR")
                    return False
            else:
                self.log(f"❌ Deposit creation failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing first deposit bonus: {str(e)}", "ERROR")
            return False
    
    def test_promo_code_bonus(self):
        """Test promo code bonus calculation"""
        self.log("Testing promo code bonus calculation...")
        
        # Test BYNIX promo code (25% for $100+)
        deposit_data = {
            "amount": 100,
            "network": "TRC20",
            "promo_code": "BYNIX"
        }
        
        try:
            response = self.session.post(f"{API_URL}/deposit/create", json=deposit_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Deposit with BYNIX promo code created")
                
                bonus_percentage = data.get('bonus_percentage')
                bonus_amount = data.get('bonus_amount')
                is_first_deposit = data.get('is_first_deposit')
                
                # For first time user: 200% first deposit + 25% promo = 225%
                expected_bonus_percentage = 225  # 200% + 25%
                expected_bonus_amount = 100 * (225 / 100)  # 225% of 100 = 225
                
                self.log(f"Bonus Percentage: {bonus_percentage}%")
                self.log(f"Bonus Amount: ${bonus_amount}")
                self.log(f"Is First Deposit: {is_first_deposit}")
                
                if (bonus_percentage == expected_bonus_percentage and 
                    bonus_amount == expected_bonus_amount):
                    self.log("✅ BYNIX promo code bonus calculation correct (stacked with first deposit)")
                    return True
                else:
                    self.log(f"❌ BYNIX promo code bonus calculation incorrect", "ERROR")
                    self.log(f"Expected: {expected_bonus_percentage}%, ${expected_bonus_amount}", "ERROR")
                    self.log(f"Got: {bonus_percentage}%, ${bonus_amount}", "ERROR")
                    return False
            else:
                self.log(f"❌ Deposit with promo code failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing promo code bonus: {str(e)}", "ERROR")
            return False
    
    def test_other_promo_codes(self):
        """Test other promo codes (WELCOME and VIP50)"""
        self.log("Testing other promo codes...")
        
        # Test WELCOME promo (10% for $50+)
        deposit_data = {
            "amount": 50,
            "network": "TRC20",
            "promo_code": "WELCOME"
        }
        
        try:
            response = self.session.post(f"{API_URL}/deposit/create", json=deposit_data)
            
            if response.status_code == 200:
                data = response.json()
                bonus_percentage = data.get('bonus_percentage')
                
                # Should be 200% (first deposit) + 10% (WELCOME) = 210%
                if bonus_percentage == 210:
                    self.log("✅ WELCOME promo code working correctly")
                else:
                    self.log(f"❌ WELCOME promo code incorrect: {bonus_percentage}% (expected 210%)", "ERROR")
                    return False
            else:
                self.log(f"❌ WELCOME promo test failed: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error testing WELCOME promo: {str(e)}", "ERROR")
            return False
        
        # Test VIP50 promo (50% for $200+)
        deposit_data = {
            "amount": 200,
            "network": "TRC20", 
            "promo_code": "VIP50"
        }
        
        try:
            response = self.session.post(f"{API_URL}/deposit/create", json=deposit_data)
            
            if response.status_code == 200:
                data = response.json()
                bonus_percentage = data.get('bonus_percentage')
                
                # Should be 200% (first deposit) + 50% (VIP50) = 250%
                if bonus_percentage == 250:
                    self.log("✅ VIP50 promo code working correctly")
                    return True
                else:
                    self.log(f"❌ VIP50 promo code incorrect: {bonus_percentage}% (expected 250%)", "ERROR")
                    return False
            else:
                self.log(f"❌ VIP50 promo test failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing other promo codes: {str(e)}", "ERROR")
            return False
    
    def manually_add_balance(self, real_balance=50, bonus_balance=100):
        """Manually add balance to test user in MongoDB for trade testing"""
        self.log(f"Manually adding balance: Real=${real_balance}, Bonus=${bonus_balance}")
        
        if self.db is None:
            self.log("❌ No MongoDB connection available", "ERROR")
            return False
        
        try:
            result = self.db.users.update_one(
                {"user_id": self.user_id},
                {"$set": {"real_balance": real_balance, "bonus_balance": bonus_balance}}
            )
            
            if result.modified_count > 0:
                self.log("✅ Balance added successfully")
                return True
            else:
                self.log("❌ Failed to update balance", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error adding balance: {str(e)}", "ERROR")
            return False
    
    def test_dual_balance_trade_deduction(self):
        """Test trade balance deduction logic (real_balance first, then bonus_balance)"""
        self.log("Testing dual balance trade deduction logic...")
        
        # First add balance manually
        if not self.manually_add_balance(50, 100):
            return False
        
        # Verify balance was added
        response = self.session.get(f"{API_URL}/auth/me")
        if response.status_code == 200:
            data = response.json()
            self.log(f"Current balances - Real: ${data.get('real_balance')}, Bonus: ${data.get('bonus_balance')}")
        
        # Create a trade for $60 (more than real_balance of $50)
        trade_data = {
            "asset": "EUR/USD",
            "trade_type": "call",
            "amount": 60,
            "duration": 60,
            "entry_price": 1.0850,
            "account_type": "real"
        }
        
        try:
            response = self.session.post(f"{API_URL}/trades", json=trade_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Trade created successfully")
                self.log(f"Trade ID: {data.get('trade_id')}")
                
                # Check updated balances
                balance_response = self.session.get(f"{API_URL}/auth/me")
                if balance_response.status_code == 200:
                    balance_data = balance_response.json()
                    new_real_balance = balance_data.get('real_balance')
                    new_bonus_balance = balance_data.get('bonus_balance')
                    
                    self.log(f"After trade - Real: ${new_real_balance}, Bonus: ${new_bonus_balance}")
                    
                    # Should deduct $50 from real_balance and $10 from bonus_balance
                    expected_real_balance = 0  # 50 - 50 = 0
                    expected_bonus_balance = 90  # 100 - 10 = 90
                    
                    if new_real_balance == expected_real_balance and new_bonus_balance == expected_bonus_balance:
                        self.log("✅ Dual balance deduction logic working correctly")
                        return True
                    else:
                        self.log(f"❌ Dual balance deduction incorrect", "ERROR")
                        self.log(f"Expected - Real: ${expected_real_balance}, Bonus: ${expected_bonus_balance}", "ERROR")
                        self.log(f"Got - Real: ${new_real_balance}, Bonus: ${new_bonus_balance}", "ERROR")
                        return False
                else:
                    self.log(f"❌ Failed to get updated balance: {balance_response.text}", "ERROR")
                    return False
            else:
                self.log(f"❌ Trade creation failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing dual balance trade deduction: {str(e)}", "ERROR")
            return False
    
    def test_trade_settlement_profits_to_real(self):
        """Test that trade settlement credits all profits to real_balance"""
        self.log("Testing trade settlement - profits go to real_balance...")
        
        # Create a new trade from bonus_balance only
        trade_data = {
            "asset": "EUR/USD",
            "trade_type": "call",
            "amount": 20,
            "duration": 60,
            "entry_price": 1.0850,
            "account_type": "real"
        }
        
        try:
            # Create trade
            response = self.session.post(f"{API_URL}/trades", json=trade_data)
            
            if response.status_code == 200:
                data = response.json()
                trade_id = data.get('trade_id')
                self.log(f"✅ New trade created: {trade_id}")
                
                # Get balance before settlement
                balance_response = self.session.get(f"{API_URL}/auth/me")
                if balance_response.status_code == 200:
                    before_data = balance_response.json()
                    before_real = before_data.get('real_balance')
                    before_bonus = before_data.get('bonus_balance')
                    self.log(f"Before settlement - Real: ${before_real}, Bonus: ${before_bonus}")
                
                # Settle trade as WIN
                settle_data = {
                    "exit_price": 1.0900  # Higher than entry price for call = WIN
                }
                
                settle_response = self.session.post(f"{API_URL}/trades/{trade_id}/settle", json=settle_data)
                
                if settle_response.status_code == 200:
                    settle_result = settle_response.json()
                    self.log(f"✅ Trade settled: {settle_result.get('status')}")
                    self.log(f"Profit/Loss: ${settle_result.get('profit_loss')}")
                    
                    # Check balance after settlement
                    after_balance_response = self.session.get(f"{API_URL}/auth/me")
                    if after_balance_response.status_code == 200:
                        after_data = after_balance_response.json()
                        after_real = after_data.get('real_balance')
                        after_bonus = after_data.get('bonus_balance')
                        
                        self.log(f"After settlement - Real: ${after_real}, Bonus: ${after_bonus}")
                        
                        # All winnings should go to real_balance
                        # Payout = original amount + profit (20 + 16 = 36 for 80% payout)
                        expected_real_increase = 36  # 20 + (20 * 0.8)
                        
                        if after_real == before_real + expected_real_increase and after_bonus == before_bonus:
                            self.log("✅ Trade settlement correctly credits profits to real_balance only")
                            return True
                        else:
                            self.log(f"❌ Trade settlement profit distribution incorrect", "ERROR")
                            self.log(f"Expected real balance increase: ${expected_real_increase}", "ERROR")
                            self.log(f"Actual real balance change: ${after_real - before_real}", "ERROR")
                            return False
                    else:
                        self.log(f"❌ Failed to get balance after settlement: {after_balance_response.text}", "ERROR")
                        return False
                else:
                    self.log(f"❌ Trade settlement failed: {settle_response.text}", "ERROR")
                    return False
            else:
                self.log(f"❌ Trade creation for settlement test failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing trade settlement: {str(e)}", "ERROR")
            return False
    
    def test_withdrawal_validation(self):
        """Test withdrawal validation - only real_balance can be withdrawn"""
        self.log("Testing withdrawal validation - only real_balance...")
        
        # Get current balance
        response = self.session.get(f"{API_URL}/auth/me")
        if response.status_code == 200:
            data = response.json()
            real_balance = data.get('real_balance')
            bonus_balance = data.get('bonus_balance')
            self.log(f"Current balances - Real: ${real_balance}, Bonus: ${bonus_balance}")
            
            # Try to withdraw more than real_balance (but less than total balance)
            withdrawal_amount = real_balance + 10  # More than real balance
            
            withdrawal_data = {
                "amount": withdrawal_amount,
                "crypto_address": "0x1234567890abcdef1234567890abcdef12345678"
            }
            
            try:
                withdrawal_response = self.session.post(f"{API_URL}/wallet/withdraw", json=withdrawal_data)
                
                if withdrawal_response.status_code == 400:
                    error_data = withdrawal_response.json()
                    if "Insufficient balance" in error_data.get('detail', ''):
                        self.log("✅ Withdrawal correctly rejected - insufficient real_balance")
                        return True
                    else:
                        self.log(f"❌ Withdrawal rejected but wrong reason: {error_data.get('detail')}", "ERROR")
                        return False
                else:
                    self.log(f"❌ Withdrawal should have been rejected but got: {withdrawal_response.status_code}", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Error testing withdrawal validation: {str(e)}", "ERROR")
                return False
        else:
            self.log(f"❌ Failed to get current balance: {response.text}", "ERROR")
            return False
    
    def test_auth_me_balance_display(self):
        """Test /auth/me endpoint balance display"""
        self.log("Testing /auth/me endpoint balance display...")
        
        try:
            response = self.session.get(f"{API_URL}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required balance fields
                required_fields = ['real_balance', 'bonus_balance', 'total_balance', 'withdrawable_balance']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log(f"❌ Missing balance fields: {missing_fields}", "ERROR")
                    return False
                
                real_balance = data.get('real_balance')
                bonus_balance = data.get('bonus_balance')
                total_balance = data.get('total_balance')
                withdrawable_balance = data.get('withdrawable_balance')
                
                self.log(f"Real Balance: ${real_balance}")
                self.log(f"Bonus Balance: ${bonus_balance}")
                self.log(f"Total Balance: ${total_balance}")
                self.log(f"Withdrawable Balance: ${withdrawable_balance}")
                
                # Verify calculations
                expected_total = real_balance + bonus_balance
                
                if total_balance == expected_total and withdrawable_balance == real_balance:
                    self.log("✅ Balance display calculations correct")
                    return True
                else:
                    self.log(f"❌ Balance display calculations incorrect", "ERROR")
                    self.log(f"Expected total: ${expected_total}, got: ${total_balance}", "ERROR")
                    self.log(f"Expected withdrawable: ${real_balance}, got: ${withdrawable_balance}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to get user info: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing auth/me balance display: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all deposit bonus and dual balance tests"""
        self.log("=" * 70)
        self.log("STARTING DEPOSIT BONUS & DUAL BALANCE TRADING SYSTEM TESTS")
        self.log("=" * 70)
        
        test_results = []
        
        # Test 1: Create test user
        if self.create_test_user():
            test_results.append(("Create Test User", True))
        else:
            test_results.append(("Create Test User", False))
            self.log("❌ Cannot proceed without test user", "ERROR")
            return test_results
        
        # Test 2: Verify initial balance state
        if self.verify_initial_balance():
            test_results.append(("Initial Balance State", True))
        else:
            test_results.append(("Initial Balance State", False))
        
        # Test 3: First deposit bonus calculation
        if self.test_first_deposit_bonus_calculation():
            test_results.append(("First Deposit Bonus (200%)", True))
        else:
            test_results.append(("First Deposit Bonus (200%)", False))
        
        # Test 4: Promo code bonus
        if self.test_promo_code_bonus():
            test_results.append(("Promo Code Bonus (BYNIX)", True))
        else:
            test_results.append(("Promo Code Bonus (BYNIX)", False))
        
        # Test 5: Other promo codes
        if self.test_other_promo_codes():
            test_results.append(("Other Promo Codes (WELCOME/VIP50)", True))
        else:
            test_results.append(("Other Promo Codes (WELCOME/VIP50)", False))
        
        # Test 6: Dual balance trade deduction
        if self.test_dual_balance_trade_deduction():
            test_results.append(("Dual Balance Trade Deduction", True))
        else:
            test_results.append(("Dual Balance Trade Deduction", False))
        
        # Test 7: Trade settlement profits to real balance
        if self.test_trade_settlement_profits_to_real():
            test_results.append(("Trade Settlement Profits to Real", True))
        else:
            test_results.append(("Trade Settlement Profits to Real", False))
        
        # Test 8: Withdrawal validation
        if self.test_withdrawal_validation():
            test_results.append(("Withdrawal Validation", True))
        else:
            test_results.append(("Withdrawal Validation", False))
        
        # Test 9: Auth/me balance display
        if self.test_auth_me_balance_display():
            test_results.append(("Auth/Me Balance Display", True))
        else:
            test_results.append(("Auth/Me Balance Display", False))
        
        return test_results
    
    def print_summary(self, test_results):
        """Print test summary"""
        self.log("=" * 70)
        self.log("DEPOSIT BONUS & DUAL BALANCE TESTING SUMMARY")
        self.log("=" * 70)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
            if result:
                passed += 1
        
        self.log("-" * 70)
        self.log(f"TOTAL: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL DEPOSIT BONUS & DUAL BALANCE TESTS PASSED!")
            return True
        else:
            self.log(f"⚠️  {total - passed} tests failed")
            return False
    
    def cleanup(self):
        """Cleanup resources"""
        if self.mongo_client:
            self.mongo_client.close()

def main():
    """Main test execution"""
    tester = BynixDepositBonusAPITester()
    
    try:
        test_results = tester.run_all_tests()
        success = tester.print_summary(test_results)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        tester.log("Testing interrupted by user", "WARNING")
        sys.exit(1)
    except Exception as e:
        tester.log(f"Unexpected error: {str(e)}", "ERROR")
        sys.exit(1)
    finally:
        tester.cleanup()

if __name__ == "__main__":
    main()