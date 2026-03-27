#!/usr/bin/env python3
"""
Backend API Testing for Talk with Doc
Tests all backend APIs in the specified order from the review request.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://quick-doc-events.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test data storage
test_data = {
    "users": {},
    "tokens": {},
    "events": {},
    "doctors": {},
    "slots": {},
    "appointments": {}
}

def log_test(test_name: str, success: bool, details: str = ""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   {details}")
    if not success:
        print()

def make_request(method: str, endpoint: str, data: Dict = None, token: str = None) -> tuple:
    """Make HTTP request and return (success, response_data, status_code)"""
    url = f"{BASE_URL}{endpoint}"
    headers = HEADERS.copy()
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=30)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            return False, {"error": f"Unsupported method: {method}"}, 0
        
        try:
            response_data = response.json()
        except:
            response_data = {"text": response.text}
        
        return response.status_code < 400, response_data, response.status_code
    
    except requests.exceptions.RequestException as e:
        return False, {"error": str(e)}, 0

def test_health_check():
    """Test health endpoint"""
    print("\n=== HEALTH CHECK ===")
    success, data, status = make_request("GET", "/health")
    
    if success and data.get("status") == "healthy":
        log_test("Health Check", True, f"Status: {data.get('status')}")
        return True
    else:
        log_test("Health Check", False, f"Status: {status}, Response: {data}")
        return False

def test_user_registration():
    """Test user registration for all roles"""
    print("\n=== USER REGISTRATION ===")
    
    users_to_register = [
        {
            "email": "patient@test.com",
            "password": "patient123",
            "full_name": "John Patient",
            "role": "patient",
            "phone": "+1234567890"
        },
        {
            "email": "doctor@test.com", 
            "password": "doctor123",
            "full_name": "Dr. Smith",
            "role": "doctor",
            "phone": "+1234567891"
        },
        {
            "email": "admin@test.com",
            "password": "admin123", 
            "full_name": "Admin User",
            "role": "admin",
            "phone": "+1234567892"
        }
    ]
    
    all_success = True
    
    for user_data in users_to_register:
        success, response, status = make_request("POST", "/auth/register", user_data)
        
        if success and response.get("access_token") and response.get("user"):
            user_info = response["user"]
            test_data["users"][user_data["role"]] = user_info
            test_data["tokens"][user_data["role"]] = response["access_token"]
            
            log_test(f"Register {user_data['role'].title()}", True, 
                    f"User ID: {user_info['id']}, Email: {user_info['email']}")
        elif status == 400 and "already registered" in response.get("detail", ""):
            # User already exists, this is fine for testing
            log_test(f"Register {user_data['role'].title()}", True, 
                    f"User already exists: {user_data['email']}")
        else:
            log_test(f"Register {user_data['role'].title()}", False, 
                    f"Status: {status}, Response: {response}")
            all_success = False
    
    return all_success

def test_user_login():
    """Test user login for all registered users"""
    print("\n=== USER LOGIN ===")
    
    login_credentials = [
        {"email": "patient@test.com", "password": "patient123", "role": "patient"},
        {"email": "doctor@test.com", "password": "doctor123", "role": "doctor"},
        {"email": "admin@test.com", "password": "admin123", "role": "admin"}
    ]
    
    all_success = True
    
    for creds in login_credentials:
        login_data = {"email": creds["email"], "password": creds["password"]}
        success, response, status = make_request("POST", "/auth/login", login_data)
        
        if success and response.get("access_token") and response.get("user"):
            user_info = response["user"]
            # Update tokens from login
            test_data["tokens"][creds["role"]] = response["access_token"]
            
            log_test(f"Login {creds['role'].title()}", True,
                    f"Token received, Role: {user_info['role']}")
        else:
            log_test(f"Login {creds['role'].title()}", False,
                    f"Status: {status}, Response: {response}")
            all_success = False
    
    return all_success

def test_doctor_profile():
    """Test doctor profile creation and retrieval"""
    print("\n=== DOCTOR PROFILE ===")
    
    if "doctor" not in test_data["tokens"]:
        log_test("Doctor Profile", False, "No doctor token available")
        return False
    
    doctor_token = test_data["tokens"]["doctor"]
    
    # First try to get existing profile
    success_get, response_get, status_get = make_request("GET", "/doctors/profile", token=doctor_token)
    
    if success_get and response_get.get("id"):
        # Profile already exists
        test_data["doctors"]["profile"] = response_get
        log_test("Get Existing Doctor Profile", True, 
                f"Profile ID: {response_get['id']}, Specialization: {response_get['specialization']}")
        return True
    
    # Create doctor profile if it doesn't exist
    profile_data = {
        "specialization": "Cardiologist",
        "qualification": "MD",
        "experience_years": 10,
        "bio": "Experienced cardiologist with 10 years of practice",
        "consultation_fee": 150.0
    }
    
    success, response, status = make_request("POST", "/doctors/profile", profile_data, doctor_token)
    
    if success and response.get("id"):
        test_data["doctors"]["profile"] = response
        log_test("Create Doctor Profile", True, 
                f"Profile ID: {response['id']}, Specialization: {response['specialization']}")
        return True
    else:
        log_test("Create Doctor Profile", False, 
                f"Status: {status}, Response: {response}")
        return False

def test_events():
    """Test event creation and listing"""
    print("\n=== EVENTS ===")
    
    if "admin" not in test_data["tokens"]:
        log_test("Events", False, "No admin token available")
        return False
    
    admin_token = test_data["tokens"]["admin"]
    
    # Create event
    event_date = datetime.now() + timedelta(days=30)
    event_data = {
        "name": "Health Camp",
        "description": "Free health checkup",
        "location": "City Hall",
        "address": "123 Main St",
        "event_date": event_date.isoformat(),
        "start_time": "09:00",
        "end_time": "17:00",
        "max_capacity": 100
    }
    
    success, response, status = make_request("POST", "/events", event_data, admin_token)
    
    if success and response.get("id"):
        test_data["events"]["health_camp"] = response
        log_test("Create Event", True, 
                f"Event ID: {response['id']}, Name: {response['name']}")
        
        # Test event listing
        success2, response2, status2 = make_request("GET", "/events")
        
        if success2 and isinstance(response2, list) and len(response2) > 0:
            # Check if our event is in the list
            event_found = any(event.get("id") == response["id"] for event in response2)
            if event_found:
                log_test("List Events", True, f"Found {len(response2)} events")
                return True
            else:
                log_test("List Events", False, "Created event not found in list")
                return False
        else:
            log_test("List Events", False, 
                    f"Status: {status2}, Response: {response2}")
            return False
    else:
        log_test("Create Event", False, 
                f"Status: {status}, Response: {response}")
        return False

def test_assign_doctor():
    """Test assigning doctor to event"""
    print("\n=== ASSIGN DOCTOR ===")
    
    if "admin" not in test_data["tokens"]:
        log_test("Assign Doctor", False, "No admin token available")
        return False
    
    if "health_camp" not in test_data["events"]:
        log_test("Assign Doctor", False, "No event available")
        return False
    
    if "profile" not in test_data["doctors"]:
        log_test("Assign Doctor", False, "No doctor profile available")
        return False
    
    admin_token = test_data["tokens"]["admin"]
    event_id = test_data["events"]["health_camp"]["id"]
    doctor_id = test_data["doctors"]["profile"]["id"]
    
    # Assign doctor to event
    success, response, status = make_request("POST", f"/events/{event_id}/doctors/{doctor_id}", 
                                           token=admin_token)
    
    if success and response.get("message"):
        log_test("Assign Doctor to Event", True, response["message"])
        
        # Verify assignment by getting event doctors
        success2, response2, status2 = make_request("GET", f"/events/{event_id}/doctors")
        
        if success2 and isinstance(response2, list):
            doctor_found = any(doc.get("id") == doctor_id for doc in response2)
            if doctor_found:
                log_test("Verify Doctor Assignment", True, 
                        f"Doctor found in event, {len(response2)} doctors assigned")
                return True
            else:
                log_test("Verify Doctor Assignment", False, 
                        "Doctor not found in event doctors list")
                return False
        else:
            log_test("Verify Doctor Assignment", False, 
                    f"Status: {status2}, Response: {response2}")
            return False
    else:
        log_test("Assign Doctor to Event", False, 
                f"Status: {status}, Response: {response}")
        return False

def test_time_slots():
    """Test time slot creation and retrieval"""
    print("\n=== TIME SLOTS ===")
    
    if "doctor" not in test_data["tokens"]:
        log_test("Time Slots", False, "No doctor token available")
        return False
    
    if "health_camp" not in test_data["events"]:
        log_test("Time Slots", False, "No event available")
        return False
    
    doctor_token = test_data["tokens"]["doctor"]
    event_id = test_data["events"]["health_camp"]["id"]
    
    # Create bulk slots
    slot_data = {
        "event_id": event_id,
        "start_time": "09:00",
        "end_time": "12:00",
        "slot_duration_minutes": 15
    }
    
    success, response, status = make_request("POST", "/slots/bulk", slot_data, doctor_token)
    
    if success and isinstance(response, list) and len(response) > 0:
        test_data["slots"]["bulk"] = response
        log_test("Create Bulk Slots", True, 
                f"Created {len(response)} slots")
        
        # Verify slots by getting doctor slots for event
        doctor_id = test_data["doctors"]["profile"]["id"]
        success2, response2, status2 = make_request("GET", 
                                                   f"/events/{event_id}/doctors/{doctor_id}/slots")
        
        if success2 and isinstance(response2, list) and len(response2) > 0:
            available_slots = [slot for slot in response2 if not slot.get("is_booked")]
            log_test("Verify Slots Created", True, 
                    f"Found {len(response2)} total slots, {len(available_slots)} available")
            return True
        else:
            log_test("Verify Slots Created", False, 
                    f"Status: {status2}, Response: {response2}")
            return False
    else:
        log_test("Create Bulk Slots", False, 
                f"Status: {status}, Response: {response}")
        return False

def test_appointments():
    """Test appointment booking and listing"""
    print("\n=== APPOINTMENTS ===")
    
    if "patient" not in test_data["tokens"]:
        log_test("Appointments", False, "No patient token available")
        return False
    
    if "bulk" not in test_data["slots"] or len(test_data["slots"]["bulk"]) == 0:
        log_test("Appointments", False, "No slots available")
        return False
    
    patient_token = test_data["tokens"]["patient"]
    
    # Get first available slot
    first_slot = test_data["slots"]["bulk"][0]
    event_id = test_data["events"]["health_camp"]["id"]
    doctor_id = test_data["doctors"]["profile"]["id"]
    
    # Book appointment
    appointment_data = {
        "doctor_id": doctor_id,
        "event_id": event_id,
        "slot_id": first_slot["id"],
        "patient_name": "John Patient",
        "patient_phone": "+1234567890",
        "reason": "Regular checkup"
    }
    
    success, response, status = make_request("POST", "/appointments", appointment_data, patient_token)
    
    if success and response.get("id") and response.get("qr_code"):
        test_data["appointments"]["booking"] = response
        log_test("Book Appointment", True, 
                f"Appointment ID: {response['id']}, QR Code generated: {len(response['qr_code'])} chars")
        
        # Test appointment listing
        success2, response2, status2 = make_request("GET", "/appointments", token=patient_token)
        
        if success2 and isinstance(response2, list) and len(response2) > 0:
            # Check if our appointment is in the list
            appointment_found = any(appt.get("id") == response["id"] for appt in response2)
            if appointment_found:
                log_test("List Appointments", True, 
                        f"Found {len(response2)} appointments")
                
                # Verify QR code exists
                our_appointment = next((appt for appt in response2 if appt.get("id") == response["id"]), None)
                if our_appointment and our_appointment.get("qr_code"):
                    log_test("Verify QR Code", True, "QR code present in appointment")
                    return True
                else:
                    log_test("Verify QR Code", False, "QR code missing from appointment")
                    return False
            else:
                log_test("List Appointments", False, "Created appointment not found in list")
                return False
        else:
            log_test("List Appointments", False, 
                    f"Status: {status2}, Response: {response2}")
            return False
    else:
        log_test("Book Appointment", False, 
                f"Status: {status}, Response: {response}")
        return False

def run_all_tests():
    """Run all tests in the specified order"""
    print("🚀 Starting Talk with Doc Backend API Tests")
    print(f"Testing against: {BASE_URL}")
    print("=" * 60)
    
    test_results = []
    
    # Test in the order specified in the review request
    test_results.append(("Health Check", test_health_check()))
    test_results.append(("User Registration", test_user_registration()))
    test_results.append(("User Login", test_user_login()))
    test_results.append(("Doctor Profile", test_doctor_profile()))
    test_results.append(("Events", test_events()))
    test_results.append(("Assign Doctor", test_assign_doctor()))
    test_results.append(("Time Slots", test_time_slots()))
    test_results.append(("Appointments", test_appointments()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(test_results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)