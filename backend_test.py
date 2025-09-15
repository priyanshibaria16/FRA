import requests
import sys
import json
from datetime import datetime

class FRAAtlasAPITester:
    def __init__(self, base_url="https://fra-map-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_claim_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoints(self):
        """Test root endpoints"""
        print("\n" + "="*50)
        print("TESTING ROOT ENDPOINTS")
        print("="*50)
        
        self.run_test("Root endpoint", "GET", "", 200)
        self.run_test("API root endpoint", "GET", "api/", 200)

    def test_user_registration(self):
        """Test user registration"""
        print("\n" + "="*50)
        print("TESTING USER REGISTRATION")
        print("="*50)
        
        # Test registration with different roles
        test_users = [
            {
                "email": f"community_user_{datetime.now().strftime('%H%M%S')}@test.com",
                "password": "TestPass123!",
                "full_name": "Test Community User",
                "role": "Community User",
                "phone": "1234567890",
                "address": "Test Address"
            },
            {
                "email": f"district_officer_{datetime.now().strftime('%H%M%S')}@test.com",
                "password": "TestPass123!",
                "full_name": "Test District Officer",
                "role": "District Officer"
            }
        ]
        
        for user_data in test_users:
            success, response = self.run_test(
                f"Register {user_data['role']}",
                "POST",
                "api/auth/register",
                200,
                data=user_data
            )
            
            if success and 'token' in response:
                # Store the first user's token for further tests
                if not self.token:
                    self.token = response['token']
                    self.user_id = response['user']['_id']
                    print(f"   Stored token for user: {response['user']['email']}")

    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n" + "="*50)
        print("TESTING USER LOGIN")
        print("="*50)
        
        # Test with provided test credentials
        success, response = self.run_test(
            "Login with test credentials",
            "POST",
            "api/auth/login",
            200,
            data={"email": "test@example.com", "password": "password123"}
        )
        
        if success and 'token' in response:
            # Use this token for further tests if we don't have one
            if not self.token:
                self.token = response['token']
                self.user_id = response['user']['_id']
                print(f"   Using test user token")

    def test_auth_me(self):
        """Test getting current user info"""
        print("\n" + "="*50)
        print("TESTING AUTH ME ENDPOINT")
        print("="*50)
        
        if not self.token:
            print("❌ No token available for auth/me test")
            return
            
        self.run_test("Get current user", "GET", "api/auth/me", 200)

    def test_claims_crud(self):
        """Test CRUD operations for claims"""
        print("\n" + "="*50)
        print("TESTING CLAIMS CRUD OPERATIONS")
        print("="*50)
        
        if not self.token:
            print("❌ No token available for claims tests")
            return

        # Test creating a claim
        claim_data = {
            "title": "Test FRA Claim",
            "description": "This is a test claim for forest rights",
            "location": {
                "lat": 20.5937,
                "lng": 78.9629,
                "address": "Test Forest Area, Test Village",
                "state": "Test State",
                "district": "Test District",
                "village": "Test Village"
            },
            "area_hectares": 5.5,
            "forest_type": "Dense forest",
            "community_details": "Test tribal community"
        }
        
        success, response = self.run_test(
            "Create claim",
            "POST",
            "api/claims",
            200,
            data=claim_data
        )
        
        if success and '_id' in response:
            self.created_claim_id = response['_id']
            print(f"   Created claim ID: {self.created_claim_id}")

        # Test getting all claims
        self.run_test("Get all claims", "GET", "api/claims", 200)

        # Test getting specific claim
        if self.created_claim_id:
            self.run_test(
                "Get specific claim",
                "GET",
                f"api/claims/{self.created_claim_id}",
                200
            )

    def test_claim_status_update(self):
        """Test updating claim status (requires officer role)"""
        print("\n" + "="*50)
        print("TESTING CLAIM STATUS UPDATE")
        print("="*50)
        
        if not self.created_claim_id:
            print("❌ No claim ID available for status update test")
            return

        # This might fail if current user doesn't have officer permissions
        update_data = {
            "status": "under_review",
            "officer_notes": "Claim is under review for verification"
        }
        
        success, response = self.run_test(
            "Update claim status",
            "PUT",
            f"api/claims/{self.created_claim_id}/status",
            200,  # Might be 403 if insufficient permissions
            data=update_data
        )
        
        if not success:
            print("   Note: Status update failed - likely due to insufficient permissions (expected for Community User)")

    def test_dashboard_endpoints(self):
        """Test dashboard and analytics endpoints"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD ENDPOINTS")
        print("="*50)
        
        if not self.token:
            print("❌ No token available for dashboard tests")
            return

        # Test dashboard stats (includes AI insights)
        print("   Note: AI insights may take a few seconds to generate...")
        self.run_test("Get dashboard stats", "GET", "api/dashboard/stats", 200)
        
        # Test map data
        self.run_test("Get map data", "GET", "api/dashboard/map-data", 200)

    def test_reports_endpoint(self):
        """Test reports endpoint"""
        print("\n" + "="*50)
        print("TESTING REPORTS ENDPOINT")
        print("="*50)
        
        if not self.token:
            print("❌ No token available for reports test")
            return

        self.run_test("Get summary report", "GET", "api/reports/summary", 200)

    def test_file_upload(self):
        """Test file upload functionality"""
        print("\n" + "="*50)
        print("TESTING FILE UPLOAD")
        print("="*50)
        
        if not self.token or not self.created_claim_id:
            print("❌ No token or claim ID available for file upload test")
            return

        # Create a dummy text file for testing
        test_content = "This is a test document for FRA claim verification."
        
        try:
            files = {'file': ('test_document.txt', test_content, 'text/plain')}
            success, response = self.run_test(
                "Upload document",
                "POST",
                f"api/claims/{self.created_claim_id}/upload",
                200,
                files=files
            )
            
            if success:
                print("   File upload successful - AI analysis should be triggered")
        except Exception as e:
            print(f"   File upload test failed: {str(e)}")

def main():
    print("🚀 Starting FRA Atlas & DSS API Testing")
    print("="*60)
    
    tester = FRAAtlasAPITester()
    
    # Run all tests in sequence
    tester.test_root_endpoints()
    tester.test_user_registration()
    tester.test_user_login()
    tester.test_auth_me()
    tester.test_claims_crud()
    tester.test_claim_status_update()
    tester.test_dashboard_endpoints()
    tester.test_reports_endpoint()
    tester.test_file_upload()
    
    # Print final results
    print("\n" + "="*60)
    print("FINAL TEST RESULTS")
    print("="*60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed - check logs above for details")
        return 1

if __name__ == "__main__":
    sys.exit(main())