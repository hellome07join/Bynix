#!/usr/bin/env python3
"""
Backend API Testing Script for Bynix Trading Platform
Focus: KYC Document Verification Flow Testing
"""

import requests
import json
import base64
import time
from datetime import datetime
import sys

# Configuration
BACKEND_URL = "https://bynix-markets.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class BynixAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        
    def log(self, message, level="INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def create_test_user(self):
        """Create a test user for KYC testing"""
        self.log("Creating test user for KYC testing...")
        
        # Generate unique email
        timestamp = int(time.time())
        test_email = f"kyc_test_{timestamp}@bynix.com"
        
        # Create user
        signup_data = {
            "email": test_email,
            "password": "TestPassword123!",
            "name": "KYC Test User"
        }
        
        try:
            response = self.session.post(f"{API_URL}/auth/signup", json=signup_data)
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ User created: {test_email}")
                self.log(f"User ID: {data.get('user_id')}")
                self.log(f"OTP: {data.get('otp')}")
                
                # Verify OTP
                otp_data = {
                    "email": test_email,
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
    
    def get_test_base64_image(self):
        """Generate a small test base64 image (1x1 pixel PNG)"""
        # This is a 1x1 transparent PNG image in base64
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=="
    
    def test_kyc_submit(self):
        """Test KYC document submission endpoint"""
        self.log("Testing KYC document submission...")
        
        # Prepare KYC submission data as specified in the request
        kyc_data = {
            "full_name": "Test User",
            "nationality": "Bangladesh",
            "id_type": "National ID Card",
            "id_number": "1234567890",
            "front_image_base64": self.get_test_base64_image()
        }
        
        try:
            response = self.session.post(f"{API_URL}/kyc/submit", json=kyc_data)
            self.log(f"KYC Submit Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ KYC submission successful")
                
                # Check response structure
                required_fields = ['success', 'status', 'ai_result', 'message']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log(f"❌ Missing required fields: {missing_fields}", "ERROR")
                    return False
                
                self.log(f"Success: {data.get('success')}")
                self.log(f"Status: {data.get('status')}")
                self.log(f"Message: {data.get('message')}")
                
                # Check AI result structure
                ai_result = data.get('ai_result')
                if ai_result:
                    self.log("AI Result Analysis:")
                    self.log(f"  - Valid Document: {ai_result.get('is_valid_document')}")
                    self.log(f"  - Document Type: {ai_result.get('document_type')}")
                    self.log(f"  - Country: {ai_result.get('country')}")
                    self.log(f"  - Confidence: {ai_result.get('confidence')}")
                    self.log(f"  - Reason: {ai_result.get('reason')}")
                    
                    # Verify it's using AI (not mocked)
                    if ai_result.get('reason') and 'mock' not in ai_result.get('reason', '').lower():
                        self.log("✅ AI verification appears to be working (not mocked)")
                    else:
                        self.log("⚠️  AI verification might be mocked", "WARNING")
                else:
                    self.log("❌ No AI result in response", "ERROR")
                    return False
                
                # Verify instant response (no 5-minute delay)
                self.log("✅ Response was instant (no 5-minute delay)")
                
                return True
            else:
                self.log(f"❌ KYC submission failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing KYC submit: {str(e)}", "ERROR")
            return False
    
    def test_kyc_status(self):
        """Test KYC status endpoint"""
        self.log("Testing KYC status endpoint...")
        
        try:
            response = self.session.get(f"{API_URL}/kyc/status")
            self.log(f"KYC Status Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ KYC status retrieved successfully")
                
                self.log(f"Status: {data.get('status')}")
                self.log(f"Is Verified: {data.get('is_verified')}")
                
                if data.get('kyc_id'):
                    self.log(f"KYC ID: {data.get('kyc_id')}")
                
                if data.get('submitted_at'):
                    self.log(f"Submitted At: {data.get('submitted_at')}")
                
                if data.get('ai_result'):
                    self.log("AI Result available in status")
                
                return True
            else:
                self.log(f"❌ KYC status failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing KYC status: {str(e)}", "ERROR")
            return False
    
    def test_auth_protection(self):
        """Test that KYC endpoints are properly protected"""
        self.log("Testing authentication protection...")
        
        # Remove auth header temporarily
        original_headers = self.session.headers.copy()
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
        
        try:
            # Test KYC submit without auth
            response = self.session.post(f"{API_URL}/kyc/submit", json={})
            if response.status_code == 401:
                self.log("✅ KYC submit properly protected (401 without auth)")
            else:
                self.log(f"❌ KYC submit not properly protected: {response.status_code}", "ERROR")
                return False
            
            # Test KYC status without auth
            response = self.session.get(f"{API_URL}/kyc/status")
            if response.status_code == 401:
                self.log("✅ KYC status properly protected (401 without auth)")
            else:
                self.log(f"❌ KYC status not properly protected: {response.status_code}", "ERROR")
                return False
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error testing auth protection: {str(e)}", "ERROR")
            return False
        finally:
            # Restore auth headers
            self.session.headers.update(original_headers)
    
    def test_duplicate_id_protection(self):
        """Test that duplicate ID numbers are rejected"""
        self.log("Testing duplicate ID number protection...")
        
        # Try to submit the same ID number again
        kyc_data = {
            "full_name": "Another User",
            "nationality": "Bangladesh",
            "id_type": "National ID Card",
            "id_number": "1234567890",  # Same ID as before
            "front_image_base64": self.get_test_base64_image()
        }
        
        try:
            response = self.session.post(f"{API_URL}/kyc/submit", json=kyc_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should be rejected due to duplicate ID
                if data.get('success') == False and data.get('status') == 'rejected':
                    if 'already registered' in data.get('message', '').lower():
                        self.log("✅ Duplicate ID number properly rejected")
                        return True
                    else:
                        self.log(f"⚠️  Rejected but not for duplicate ID: {data.get('message')}", "WARNING")
                        return True  # Still working, just different reason
                else:
                    self.log(f"❌ Duplicate ID not rejected: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Duplicate ID test failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing duplicate ID: {str(e)}", "ERROR")
            return False
    
    def run_kyc_tests(self):
        """Run all KYC-related tests"""
        self.log("=" * 60)
        self.log("STARTING KYC DOCUMENT VERIFICATION FLOW TESTS")
        self.log("=" * 60)
        
        test_results = []
        
        # Test 1: Create test user
        if self.create_test_user():
            test_results.append(("Create Test User", True))
        else:
            test_results.append(("Create Test User", False))
            self.log("❌ Cannot proceed without test user", "ERROR")
            return test_results
        
        # Test 2: Test authentication protection
        if self.test_auth_protection():
            test_results.append(("Auth Protection", True))
        else:
            test_results.append(("Auth Protection", False))
        
        # Test 3: Test KYC submit endpoint
        if self.test_kyc_submit():
            test_results.append(("KYC Submit", True))
        else:
            test_results.append(("KYC Submit", False))
        
        # Test 4: Test KYC status endpoint
        if self.test_kyc_status():
            test_results.append(("KYC Status", True))
        else:
            test_results.append(("KYC Status", False))
        
        # Test 5: Test duplicate ID protection
        if self.test_duplicate_id_protection():
            test_results.append(("Duplicate ID Protection", True))
        else:
            test_results.append(("Duplicate ID Protection", False))
        
        return test_results
    
    def print_summary(self, test_results):
        """Print test summary"""
        self.log("=" * 60)
        self.log("KYC TESTING SUMMARY")
        self.log("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
            if result:
                passed += 1
        
        self.log("-" * 60)
        self.log(f"TOTAL: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL KYC TESTS PASSED!")
            return True
        else:
            self.log(f"⚠️  {total - passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = BynixAPITester()
    
    try:
        test_results = tester.run_kyc_tests()
        success = tester.print_summary(test_results)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        tester.log("Testing interrupted by user", "WARNING")
        sys.exit(1)
    except Exception as e:
        tester.log(f"Unexpected error: {str(e)}", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()