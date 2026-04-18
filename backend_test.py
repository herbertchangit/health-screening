#!/usr/bin/env python3
"""
Backend API Testing for Talk with Doc - News Feed API
Tests all News Feed CRUD operations with proper authentication
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://quick-doc-events.preview.emergentagent.com/api"

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@test.com",
    "password": "admin123"
}

PATIENT_CREDENTIALS = {
    "email": "patient@test.com", 
    "password": "patient123"
}

class NewsAPITester:
    def __init__(self):
        self.admin_token = None
        self.patient_token = None
        self.created_news_ids = []
        
    def login(self, credentials):
        """Login and get JWT token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=credentials)
            print(f"Login attempt for {credentials['email']}: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                return data["access_token"]
            else:
                print(f"Login failed: {response.text}")
                return None
        except Exception as e:
            print(f"Login error: {e}")
            return None
    
    def setup_auth(self):
        """Setup authentication tokens"""
        print("=== Setting up authentication ===")
        self.admin_token = self.login(ADMIN_CREDENTIALS)
        self.patient_token = self.login(PATIENT_CREDENTIALS)
        
        if not self.admin_token:
            print("❌ CRITICAL: Admin login failed")
            return False
        if not self.patient_token:
            print("❌ CRITICAL: Patient login failed") 
            return False
            
        print("✅ Authentication setup successful")
        return True
    
    def get_headers(self, token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_news(self):
        """Test creating news posts as admin"""
        print("\n=== Testing News Creation (Admin Only) ===")
        
        # Test data for 3 different news posts
        news_posts = [
            {
                "title": "Important Medical Conference Announcement",
                "summary": "Join us for the annual medical conference featuring latest healthcare innovations",
                "content": "We are excited to announce our annual medical conference scheduled for next month. This event will feature renowned speakers, latest medical technologies, and networking opportunities for healthcare professionals.",
                "category": "announcement",
                "is_pinned": True,
                "is_urgent": False,
                "is_published": True
            },
            {
                "title": "Emergency Health Alert - Flu Season",
                "summary": "Important health advisory regarding the upcoming flu season",
                "content": "Health authorities have issued an advisory regarding the upcoming flu season. Please ensure you get vaccinated and follow proper hygiene protocols. Contact your healthcare provider for more information.",
                "category": "alert", 
                "is_pinned": False,
                "is_urgent": True,
                "is_published": True
            },
            {
                "title": "New Telemedicine Services Available",
                "summary": "We now offer convenient telemedicine consultations for routine check-ups",
                "content": "Our clinic is pleased to announce the launch of telemedicine services. Patients can now schedule virtual consultations for routine check-ups, follow-up appointments, and non-emergency medical concerns. Book your virtual appointment today!",
                "category": "general",
                "is_pinned": False,
                "is_urgent": False,
                "is_published": True
            }
        ]
        
        for i, news_data in enumerate(news_posts, 1):
            try:
                response = requests.post(
                    f"{BASE_URL}/news",
                    json=news_data,
                    headers=self.get_headers(self.admin_token)
                )
                
                print(f"Creating news post {i}: {response.status_code}")
                
                if response.status_code == 200:
                    created_news = response.json()
                    self.created_news_ids.append(created_news["id"])
                    print(f"✅ News post {i} created successfully - ID: {created_news['id']}")
                    print(f"   Title: {created_news['title']}")
                    print(f"   Category: {created_news['category']}")
                    print(f"   Pinned: {created_news['is_pinned']}")
                    print(f"   Urgent: {created_news['is_urgent']}")
                else:
                    print(f"❌ Failed to create news post {i}: {response.text}")
                    
            except Exception as e:
                print(f"❌ Error creating news post {i}: {e}")
        
        print(f"Created {len(self.created_news_ids)} news posts")
        return len(self.created_news_ids) > 0
    
    def test_list_news(self):
        """Test listing all news"""
        print("\n=== Testing News Listing ===")
        
        try:
            response = requests.get(f"{BASE_URL}/news")
            print(f"GET /api/news: {response.status_code}")
            
            if response.status_code == 200:
                news_list = response.json()
                print(f"✅ Retrieved {len(news_list)} news items")
                
                # Check if pinned items come first
                pinned_found = False
                non_pinned_found = False
                
                for item in news_list:
                    print(f"   - {item['title']} (Category: {item['category']}, Pinned: {item['is_pinned']}, Urgent: {item['is_urgent']})")
                    
                    if item['is_pinned'] and non_pinned_found:
                        print("❌ Pinned item found after non-pinned item - sorting issue")
                        return False
                    
                    if item['is_pinned']:
                        pinned_found = True
                    else:
                        non_pinned_found = True
                
                if pinned_found:
                    print("✅ Pinned items are properly sorted first")
                
                return True
            else:
                print(f"❌ Failed to list news: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error listing news: {e}")
            return False
    
    def test_category_filter(self):
        """Test category filtering"""
        print("\n=== Testing Category Filter ===")
        
        try:
            response = requests.get(f"{BASE_URL}/news?category=announcement")
            print(f"GET /api/news?category=announcement: {response.status_code}")
            
            if response.status_code == 200:
                news_list = response.json()
                print(f"✅ Retrieved {len(news_list)} announcement items")
                
                # Verify all items are announcements
                for item in news_list:
                    if item['category'] != 'announcement':
                        print(f"❌ Non-announcement item found: {item['title']} (Category: {item['category']})")
                        return False
                    print(f"   - {item['title']} (Category: {item['category']})")
                
                print("✅ Category filter working correctly")
                return True
            else:
                print(f"❌ Failed to filter by category: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing category filter: {e}")
            return False
    
    def test_search_filter(self):
        """Test search functionality"""
        print("\n=== Testing Search Filter ===")
        
        try:
            response = requests.get(f"{BASE_URL}/news?search=medical")
            print(f"GET /api/news?search=medical: {response.status_code}")
            
            if response.status_code == 200:
                news_list = response.json()
                print(f"✅ Retrieved {len(news_list)} items matching 'medical'")
                
                # Verify search results contain the keyword
                for item in news_list:
                    title_match = 'medical' in item['title'].lower()
                    summary_match = 'medical' in item['summary'].lower()
                    content_match = 'medical' in item['content'].lower()
                    
                    if not (title_match or summary_match or content_match):
                        print(f"❌ Search result doesn't contain 'medical': {item['title']}")
                        return False
                    print(f"   - {item['title']}")
                
                print("✅ Search filter working correctly")
                return True
            else:
                print(f"❌ Failed to search news: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing search filter: {e}")
            return False
    
    def test_single_news_item(self):
        """Test getting single news item and view count increment"""
        print("\n=== Testing Single News Item & View Count ===")
        
        if not self.created_news_ids:
            print("❌ No news items to test")
            return False
        
        news_id = self.created_news_ids[0]
        
        try:
            # Get initial view count
            response1 = requests.get(f"{BASE_URL}/news/{news_id}")
            print(f"GET /api/news/{news_id} (first call): {response1.status_code}")
            
            if response1.status_code == 200:
                news1 = response1.json()
                initial_views = news1.get('view_count', 0)
                print(f"✅ Retrieved news item: {news1['title']}")
                print(f"   Initial view count: {initial_views}")
                
                # Get again to test view count increment
                time.sleep(1)  # Small delay
                response2 = requests.get(f"{BASE_URL}/news/{news_id}")
                print(f"GET /api/news/{news_id} (second call): {response2.status_code}")
                
                if response2.status_code == 200:
                    news2 = response2.json()
                    new_views = news2.get('view_count', 0)
                    print(f"   New view count: {new_views}")
                    
                    if new_views > initial_views:
                        print("✅ View count incremented correctly")
                        return True
                    else:
                        print("❌ View count not incremented")
                        return False
                else:
                    print(f"❌ Failed second request: {response2.text}")
                    return False
            else:
                print(f"❌ Failed to get news item: {response1.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing single news item: {e}")
            return False
    
    def test_update_news(self):
        """Test updating news as admin"""
        print("\n=== Testing News Update (Admin Only) ===")
        
        if not self.created_news_ids:
            print("❌ No news items to update")
            return False
        
        news_id = self.created_news_ids[0]
        update_data = {
            "title": "UPDATED: Important Medical Conference Announcement",
            "summary": "Updated summary with new information about the medical conference"
        }
        
        try:
            response = requests.put(
                f"{BASE_URL}/news/{news_id}",
                json=update_data,
                headers=self.get_headers(self.admin_token)
            )
            
            print(f"PUT /api/news/{news_id}: {response.status_code}")
            
            if response.status_code == 200:
                updated_news = response.json()
                print(f"✅ News updated successfully")
                print(f"   New title: {updated_news['title']}")
                print(f"   New summary: {updated_news['summary']}")
                
                # Verify the update
                if updated_news['title'] == update_data['title']:
                    print("✅ Title update verified")
                    return True
                else:
                    print("❌ Title update not reflected")
                    return False
            else:
                print(f"❌ Failed to update news: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error updating news: {e}")
            return False
    
    def test_patient_permissions(self):
        """Test patient permissions (should not be able to create news)"""
        print("\n=== Testing Patient Permissions ===")
        
        # Test patient trying to create news (should fail)
        news_data = {
            "title": "Patient Attempt",
            "summary": "This should fail",
            "content": "Patients should not be able to create news",
            "category": "general"
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/news",
                json=news_data,
                headers=self.get_headers(self.patient_token)
            )
            
            print(f"POST /api/news (as patient): {response.status_code}")
            
            if response.status_code == 403:
                print("✅ Patient correctly denied access to create news")
                
                # Test patient can still read news
                response = requests.get(f"{BASE_URL}/news")
                print(f"GET /api/news (as patient): {response.status_code}")
                
                if response.status_code == 200:
                    print("✅ Patient can read news (public access)")
                    return True
                else:
                    print("❌ Patient cannot read news")
                    return False
            else:
                print(f"❌ Patient was allowed to create news (should be denied): {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing patient permissions: {e}")
            return False
    
    def test_delete_news(self):
        """Test deleting news as admin"""
        print("\n=== Testing News Deletion (Admin Only) ===")
        
        if not self.created_news_ids:
            print("❌ No news items to delete")
            return False
        
        news_id = self.created_news_ids[-1]  # Delete the last created item
        
        try:
            response = requests.delete(
                f"{BASE_URL}/news/{news_id}",
                headers=self.get_headers(self.admin_token)
            )
            
            print(f"DELETE /api/news/{news_id}: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ News deleted successfully")
                
                # Verify deletion by trying to get the item
                response = requests.get(f"{BASE_URL}/news/{news_id}")
                print(f"GET deleted news item: {response.status_code}")
                
                if response.status_code == 404:
                    print("✅ Deleted news item no longer accessible")
                    self.created_news_ids.remove(news_id)
                    return True
                else:
                    print("❌ Deleted news item still accessible")
                    return False
            else:
                print(f"❌ Failed to delete news: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error deleting news: {e}")
            return False
    
    def run_all_tests(self):
        """Run all News Feed API tests"""
        print("🚀 Starting News Feed API Tests")
        print("=" * 50)
        
        # Setup authentication
        if not self.setup_auth():
            print("❌ CRITICAL: Authentication setup failed - cannot proceed")
            return False
        
        # Run tests in sequence
        tests = [
            ("Create News Posts", self.test_create_news),
            ("List All News", self.test_list_news),
            ("Category Filter", self.test_category_filter),
            ("Search Filter", self.test_search_filter),
            ("Single News Item & View Count", self.test_single_news_item),
            ("Update News", self.test_update_news),
            ("Patient Permissions", self.test_patient_permissions),
            ("Delete News", self.test_delete_news)
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            print(f"\n{'='*20} {test_name} {'='*20}")
            try:
                results[test_name] = test_func()
            except Exception as e:
                print(f"❌ Test '{test_name}' failed with exception: {e}")
                results[test_name] = False
        
        # Summary
        print("\n" + "="*50)
        print("📊 TEST RESULTS SUMMARY")
        print("="*50)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} - {test_name}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All News Feed API tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) FAILED")
            return False

if __name__ == "__main__":
    tester = NewsAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)