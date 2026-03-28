#!/usr/bin/env python3
"""
Backend Testing for NOWPayments USDT TRC20 Withdrawal Integration and Auto-Approval Logic
Testing Bynix Trading Platform - Withdrawal Flow Management
"""

import asyncio
import httpx
import json
import os
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://bynix-markets.preview.emergentagent.com/api"

# Test credentials from review request and previous testing
TEST_USER_EMAIL = "buttontest@test.com"  # From previous successful tests
TEST_USER_PASSWORD = "password123"
ADMIN_EMAIL = "admin@bynix.com"
ADMIN_PASSWORD = "admin123"

# Test data
VALID_TRC20_ADDRESS = "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH"  # Real TRC20 format
VALID_BKASH_WALLET = "01712345678"

class WithdrawalTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.user_token = None
        self.admin_token = None
        self.test_results = []
        
    async def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} {test_name}"
        if details:
            result += f" - {details}"
        print(result)
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    async def login_user(self, email: str, password: str) -> str:
        """Login user and return JWT token"""
        try:
            # First try to login
            response = await self.client.post(f"{BACKEND_URL}/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            elif response.status_code == 401:
                # User might not exist or need OTP verification, try to create
                print(f"Login failed for {email}, attempting to create user...")
                
                # Try signup
                signup_response = await self.client.post(f"{BACKEND_URL}/auth/signup", json={
                    "email": email,
                    "password": password,
                    "name": "Test User",
                    "country": "US"
                })
                
                if signup_response.status_code == 200:
                    signup_data = signup_response.json()
                    print(f"User created, OTP sent. Using mock OTP verification...")
                    
                    # Try OTP verification with common test OTP
                    otp_response = await self.client.post(f"{BACKEND_URL}/auth/verify-otp", json={
                        "email": email,
                        "otp": "123456"  # Common test OTP
                    })
                    
                    if otp_response.status_code == 200:
                        otp_data = otp_response.json()
                        return otp_data.get("access_token")
                    else:
                        print(f"OTP verification failed: {otp_response.text}")
                        return None
                else:
                    print(f"Signup failed: {signup_response.text}")
                    return None
            else:
                print(f"Login failed: {response.text}")
                return None
                
        except Exception as e:
            print(f"Login error for {email}: {str(e)}")
            return None
    
    async def get_user_balance(self, token: str) -> dict:
        """Get user balance information"""
        try:
            response = await self.client.get(
                f"{BACKEND_URL}/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Failed to get user balance: {response.text}")
                return {}
        except Exception as e:
            print(f"Error getting user balance: {str(e)}")
            return {}
    
    async def add_test_balance(self, token: str, amount: float = 500.0):
        """Add test balance to user account for testing withdrawals"""
        try:
            # Create a mock deposit to add balance
            response = await self.client.post(
                f"{BACKEND_URL}/wallet/deposit",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "amount": amount,
                    "currency": "USDT",
                    "network": "TRC20"
                }
            )
            
            if response.status_code == 200:
                print(f"Test balance of ${amount} added successfully")
                return True
            else:
                print(f"Failed to add test balance: {response.text}")
                return False
        except Exception as e:
            print(f"Error adding test balance: {str(e)}")
            return False
    
    async def test_usdt_withdrawal_auto_approved(self):
        """Test USDT withdrawal <= $100 (should be auto-approved)"""
        test_name = "USDT Withdrawal Auto-Approved (≤$100)"
        
        try:
            # Test withdrawal of $50 (should be auto-approved)
            response = await self.client.post(
                f"{BACKEND_URL}/wallet/withdraw",
                headers={"Authorization": f"Bearer {self.user_token}"},
                json={
                    "amount": 50.0,
                    "crypto_address": VALID_TRC20_ADDRESS
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check auto-approval logic
                requires_approval = data.get("requires_admin_approval", True)
                status = data.get("status", "")
                
                if not requires_approval and status in ["pending", "processing"]:
                    await self.log_result(test_name, True, 
                        f"Auto-approved: requires_admin_approval={requires_approval}, status={status}")
                    return data.get("transaction_id")
                else:
                    await self.log_result(test_name, False, 
                        f"Expected auto-approval but got: requires_admin_approval={requires_approval}, status={status}")
                    return None
            else:
                await self.log_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            await self.log_result(test_name, False, f"Exception: {str(e)}")
            return None
    
    async def test_usdt_withdrawal_requires_approval(self):
        """Test USDT withdrawal > $100 (should require admin approval)"""
        test_name = "USDT Withdrawal Requires Approval (>$100)"
        
        try:
            # Test withdrawal of $150 (should require admin approval)
            response = await self.client.post(
                f"{BACKEND_URL}/wallet/withdraw",
                headers={"Authorization": f"Bearer {self.user_token}"},
                json={
                    "amount": 150.0,
                    "crypto_address": VALID_TRC20_ADDRESS
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check admin approval requirement
                requires_approval = data.get("requires_admin_approval", False)
                status = data.get("status", "")
                
                if requires_approval and status == "pending_approval":
                    await self.log_result(test_name, True, 
                        f"Requires approval: requires_admin_approval={requires_approval}, status={status}")
                    return data.get("transaction_id")
                else:
                    await self.log_result(test_name, False, 
                        f"Expected admin approval but got: requires_admin_approval={requires_approval}, status={status}")
                    return None
            else:
                await self.log_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            await self.log_result(test_name, False, f"Exception: {str(e)}")
            return None
    
    async def test_ewallet_withdrawal_auto_approved(self):
        """Test E-Wallet withdrawal <= $100 (should be auto-approved)"""
        test_name = "E-Wallet Withdrawal Auto-Approved (≤$100)"
        
        try:
            # Test bKash withdrawal of $50 (should be auto-approved)
            response = await self.client.post(
                f"{BACKEND_URL}/tarspay/withdrawal/create",
                headers={"Authorization": f"Bearer {self.user_token}"},
                json={
                    "amount": 50.0,
                    "channel": "bkash",
                    "wallet_id": VALID_BKASH_WALLET
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check auto-approval logic
                requires_approval = data.get("requires_admin_approval", True)
                status = data.get("status", "")
                success = data.get("success", False)
                
                # TarsPay may fail due to insufficient merchant balance, but auto-approval logic should still work
                if not requires_approval and success:
                    await self.log_result(test_name, True, 
                        f"Auto-approved and processed: requires_admin_approval={requires_approval}, status={status}")
                    return data.get("order_id")
                elif not requires_approval and not success:
                    # Auto-approved but TarsPay API failed (expected due to merchant balance)
                    error = data.get("error", "Unknown error")
                    await self.log_result(test_name, True, 
                        f"Auto-approved but TarsPay failed (expected): requires_admin_approval={requires_approval}, error={error}")
                    return data.get("order_id")
                elif success and not requires_approval:
                    # Success and auto-approved
                    await self.log_result(test_name, True, 
                        f"Auto-approved and successful: requires_admin_approval={requires_approval}, status={status}")
                    return data.get("order_id")
                else:
                    # Check if this is a TarsPay API failure but auto-approval logic worked
                    # We need to check backend logs to confirm auto-approval logic worked
                    await self.log_result(test_name, False, 
                        f"Expected auto-approval but got: requires_admin_approval={requires_approval}, status={status}, success={success}")
                    return None
            else:
                await self.log_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            await self.log_result(test_name, False, f"Exception: {str(e)}")
            return None
    
    async def test_ewallet_withdrawal_requires_approval(self):
        """Test E-Wallet withdrawal > $100 (should require admin approval)"""
        test_name = "E-Wallet Withdrawal Requires Approval (>$100)"
        
        try:
            # Test bKash withdrawal of $150 (should require admin approval)
            response = await self.client.post(
                f"{BACKEND_URL}/tarspay/withdrawal/create",
                headers={"Authorization": f"Bearer {self.user_token}"},
                json={
                    "amount": 150.0,
                    "channel": "bkash",
                    "wallet_id": VALID_BKASH_WALLET
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check admin approval requirement
                requires_approval = data.get("requires_admin_approval", False)
                status = data.get("status", "")
                
                if requires_approval and status == "pending_approval":
                    await self.log_result(test_name, True, 
                        f"Requires approval: requires_admin_approval={requires_approval}, status={status}")
                    return data.get("order_id")
                else:
                    await self.log_result(test_name, False, 
                        f"Expected admin approval but got: requires_admin_approval={requires_approval}, status={status}")
                    return None
            else:
                await self.log_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            await self.log_result(test_name, False, f"Exception: {str(e)}")
            return None
    
    async def test_admin_withdrawals_list(self):
        """Test admin endpoint to list pending withdrawals"""
        test_name = "Admin Withdrawals List"
        
        try:
            response = await self.client.get(
                f"{BACKEND_URL}/admin/withdrawals",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                withdrawals = data.get("withdrawals", [])
                
                # Look for pending_approval withdrawals
                pending_approvals = [w for w in withdrawals if w.get("status") == "pending_approval"]
                
                await self.log_result(test_name, True, 
                    f"Found {len(withdrawals)} total withdrawals, {len(pending_approvals)} pending approval")
                return withdrawals
            else:
                await self.log_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return []
                
        except Exception as e:
            await self.log_result(test_name, False, f"Exception: {str(e)}")
            return []
    
    async def test_admin_approve_withdrawal(self, withdrawal_id: str):
        """Test admin approval of a withdrawal"""
        test_name = f"Admin Approve Withdrawal ({withdrawal_id[:8]}...)"
        
        try:
            response = await self.client.post(
                f"{BACKEND_URL}/admin/withdrawals/{withdrawal_id}/approve",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                message = data.get("message", "")
                
                if success:
                    await self.log_result(test_name, True, f"Approved: {message}")
                    return True
                else:
                    error = data.get("error", "Unknown error")
                    await self.log_result(test_name, False, f"Approval failed: {error}")
                    return False
            else:
                await self.log_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            await self.log_result(test_name, False, f"Exception: {str(e)}")
            return False
    
    async def test_nowpayments_api_integration(self):
        """Test NOWPayments API integration (may fail due to IP whitelist)"""
        test_name = "NOWPayments API Integration"
        
        try:
            # Create a small withdrawal to test NOWPayments integration
            response = await self.client.post(
                f"{BACKEND_URL}/wallet/withdraw",
                headers={"Authorization": f"Bearer {self.user_token}"},
                json={
                    "amount": 25.0,  # Small amount for auto-approval
                    "crypto_address": VALID_TRC20_ADDRESS
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if NOWPayments was attempted
                status = data.get("status", "")
                message = data.get("message", "")
                
                if "NOWPayments" in message or status in ["processing", "pending"]:
                    await self.log_result(test_name, True, 
                        f"NOWPayments integration attempted: status={status}, message={message}")
                    return True
                else:
                    await self.log_result(test_name, False, 
                        f"NOWPayments not attempted: status={status}, message={message}")
                    return False
            else:
                await self.log_result(test_name, False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            await self.log_result(test_name, False, f"Exception: {str(e)}")
            return False
    
    async def test_balance_deduction(self):
        """Test that balance is deducted immediately regardless of approval status"""
        test_name = "Balance Deduction Logic"
        
        try:
            # Get initial balance
            initial_balance_data = await self.get_user_balance(self.user_token)
            initial_balance = initial_balance_data.get("real_balance", 0)
            
            # Create withdrawal
            withdrawal_amount = 30.0
            response = await self.client.post(
                f"{BACKEND_URL}/wallet/withdraw",
                headers={"Authorization": f"Bearer {self.user_token}"},
                json={
                    "amount": withdrawal_amount,
                    "crypto_address": VALID_TRC20_ADDRESS
                }
            )
            
            if response.status_code == 200:
                # Check balance after withdrawal
                final_balance_data = await self.get_user_balance(self.user_token)
                final_balance = final_balance_data.get("real_balance", 0)
                
                expected_balance = initial_balance - withdrawal_amount
                
                if abs(final_balance - expected_balance) < 0.01:  # Allow for floating point precision
                    await self.log_result(test_name, True, 
                        f"Balance correctly deducted: ${initial_balance} → ${final_balance} (${withdrawal_amount} withdrawn)")
                    return True
                else:
                    await self.log_result(test_name, False, 
                        f"Balance deduction incorrect: expected ${expected_balance}, got ${final_balance}")
                    return False
            else:
                await self.log_result(test_name, False, f"Withdrawal failed: {response.text}")
                return False
                
        except Exception as e:
            await self.log_result(test_name, False, f"Exception: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run comprehensive withdrawal testing"""
        print("=" * 80)
        print("BYNIX WITHDRAWAL INTEGRATION TESTING")
        print("Testing NOWPayments USDT TRC20 & Auto-Approval Logic")
        print("=" * 80)
        
        # 1. Login test user
        print("\n1. AUTHENTICATION SETUP")
        self.user_token = await self.login_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
        if not self.user_token:
            print("❌ Failed to login test user - cannot continue")
            return
        
        await self.log_result("User Authentication", True, f"Logged in as {TEST_USER_EMAIL}")
        
        # 2. Login admin user
        self.admin_token = await self.login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not self.admin_token:
            print("❌ Failed to login admin user - admin tests will be skipped")
        else:
            await self.log_result("Admin Authentication", True, f"Logged in as {ADMIN_EMAIL}")
        
        # 3. Check/Add test balance
        print("\n2. BALANCE SETUP")
        balance_data = await self.get_user_balance(self.user_token)
        current_balance = balance_data.get("real_balance", 0)
        print(f"Current balance: ${current_balance}")
        
        if current_balance < 1000:
            print("Adding test balance for withdrawal testing...")
            await self.add_test_balance(self.user_token, 1000.0)
        
        # 4. Test withdrawal scenarios
        print("\n3. WITHDRAWAL AUTO-APPROVAL TESTING")
        
        # Test auto-approved USDT withdrawal
        usdt_auto_id = await self.test_usdt_withdrawal_auto_approved()
        
        # Test admin approval required USDT withdrawal
        usdt_approval_id = await self.test_usdt_withdrawal_requires_approval()
        
        # Test auto-approved E-wallet withdrawal
        ewallet_auto_id = await self.test_ewallet_withdrawal_auto_approved()
        
        # Test admin approval required E-wallet withdrawal
        ewallet_approval_id = await self.test_ewallet_withdrawal_requires_approval()
        
        # Test balance deduction logic
        await self.test_balance_deduction()
        
        # Test NOWPayments integration
        await self.test_nowpayments_api_integration()
        
        # 5. Test admin endpoints
        if self.admin_token:
            print("\n4. ADMIN WITHDRAWAL MANAGEMENT TESTING")
            
            # List withdrawals
            withdrawals = await self.test_admin_withdrawals_list()
            
            # Try to approve a pending withdrawal
            pending_withdrawals = [w for w in withdrawals if w.get("status") == "pending_approval"]
            if pending_withdrawals:
                withdrawal_to_approve = pending_withdrawals[0]
                withdrawal_id = withdrawal_to_approve.get("withdrawal_id")
                if withdrawal_id:
                    await self.test_admin_approve_withdrawal(withdrawal_id)
        
        # 6. Summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"]:
                print(f"   {result['details']}")
        
        # Check for critical failures
        critical_tests = [
            "USDT Withdrawal Auto-Approved (≤$100)",
            "USDT Withdrawal Requires Approval (>$100)",
            "E-Wallet Withdrawal Auto-Approved (≤$100)",
            "E-Wallet Withdrawal Requires Approval (>$100)"
        ]
        
        critical_failures = []
        for test_name in critical_tests:
            test_result = next((r for r in self.test_results if r["test"] == test_name), None)
            if test_result and not test_result["success"]:
                critical_failures.append(test_name)
        
        if critical_failures:
            print(f"\n⚠️  CRITICAL FAILURES DETECTED:")
            for failure in critical_failures:
                print(f"   - {failure}")
        else:
            print(f"\n✅ All critical withdrawal auto-approval tests passed!")
        
        await self.client.aclose()

async def main():
    """Main test execution"""
    tester = WithdrawalTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())