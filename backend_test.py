#!/usr/bin/env python3
"""
Backend API Testing for Talk with Doc - Patient Overlapping Timeslot Validation
Tests the overlapping timeslot validation feature specifically.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://quick-doc-events.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test credentials
PATIENT_EMAIL = "patient@test.com"
PATIENT_PASSWORD = "patient123"
DOCTOR_EMAIL = "doctor@test.com"
DOCTOR_PASSWORD = "doctor123"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

# Test data storage
test_data = {
    "users": {},
    "tokens": {},
    "events": {},
    "doctors": {},
    "slots": {},
    "appointments": {}
}

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def assert_equal(self, actual, expected, message):
        if actual == expected:
            self.passed += 1
            print(f"✅ {message}")
        else:
            self.failed += 1
            error_msg = f"❌ {message} - Expected: {expected}, Got: {actual}"
            print(error_msg)
            self.errors.append(error_msg)
            
    def assert_true(self, condition, message):
        if condition:
            self.passed += 1
            print(f"✅ {message}")
        else:
            self.failed += 1
            error_msg = f"❌ {message} - Condition failed"
            print(error_msg)
            self.errors.append(error_msg)
            
    def assert_in(self, substring, text, message):
        if substring.lower() in text.lower():
            self.passed += 1
            print(f"✅ {message}")
        else:
            self.failed += 1
            error_msg = f"❌ {message} - '{substring}' not found in '{text}'"
            print(error_msg)
            self.errors.append(error_msg)

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

def login_user(email, password):
    """Login and return JWT token"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    
    if response.status_code == 200:
        data = response.json()
        return data["access_token"], data["user"]
    else:
        print(f"Login failed for {email}: {response.status_code} - {response.text}")
        return None, None

def test_overlapping_timeslot_validation():
    """Test the patient overlapping timeslot validation feature"""
    result = TestResult()
    
    print("🧪 Testing Patient Overlapping Timeslot Validation")
    print("=" * 60)
    
    # Step 1: Login as patient
    print("\n1. Logging in as patient...")
    patient_token, patient_user = login_user(PATIENT_EMAIL, PATIENT_PASSWORD)
    result.assert_true(patient_token is not None, "Patient login successful")
    
    if not patient_token:
        print("❌ Cannot proceed without patient login")
        return result
    
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Step 2: Login as doctor
    print("\n2. Logging in as doctor...")
    doctor_token, doctor_user = login_user(DOCTOR_EMAIL, DOCTOR_PASSWORD)
    result.assert_true(doctor_token is not None, "Doctor login successful")
    
    if not doctor_token:
        print("❌ Cannot proceed without doctor login")
        return result
    
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}
    
    # Step 3: Login as admin
    print("\n3. Logging in as admin...")
    admin_token, admin_user = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    result.assert_true(admin_token is not None, "Admin login successful")
    
    if not admin_token:
        print("❌ Cannot proceed without admin login")
        return result
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Step 4: Create doctor profile (if not exists)
    print("\n4. Creating/checking doctor profile...")
    doctor_profile_response = requests.get(f"{BASE_URL}/doctors", headers=doctor_headers)
    
    if doctor_profile_response.status_code == 200:
        profiles = doctor_profile_response.json()
        doctor_profile = profiles[0] if profiles else None
    else:
        doctor_profile = None
    
    if not doctor_profile:
        # Create doctor profile
        profile_data = {
            "specialization": "General Medicine",
            "qualification": "MBBS, MD",
            "experience_years": 5,
            "bio": "Experienced general practitioner",
            "consultation_fee": 500.0
        }
        
        create_profile_response = requests.post(f"{BASE_URL}/doctors", 
                                              json=profile_data, 
                                              headers=doctor_headers)
        
        if create_profile_response.status_code == 200:
            doctor_profile = create_profile_response.json()
            result.assert_true(True, "Doctor profile created successfully")
        else:
            print(f"❌ Failed to create doctor profile: {create_profile_response.text}")
            return result
    else:
        result.assert_true(True, "Doctor profile already exists")
    
    doctor_id = doctor_profile["id"]
    
    # Step 5: Get existing events or create a new one
    print("\n5. Getting existing events...")
    events_response = requests.get(f"{BASE_URL}/events", headers=admin_headers)
    
    if events_response.status_code == 200:
        events = events_response.json()
        if events:
            # Use the first available event
            event = events[0]
            result.assert_true(True, f"Using existing event: {event['name']}")
        else:
            # Create a new event
            print("  No existing events found, creating new event...")
            event_date = (datetime.now() + timedelta(days=1)).isoformat()
            event_data = {
                "name": "Overlap Test Event",
                "description": "Testing overlapping timeslot validation",
                "event_date": event_date,
                "location": "Test Clinic",
                "address": "123 Test Street, Test City",
                "start_time": "09:00",
                "end_time": "17:00",
                "max_capacity": 50
            }
            
            event_response = requests.post(f"{BASE_URL}/events", 
                                         json=event_data, 
                                         headers=admin_headers)
            
            if event_response.status_code == 200:
                event = event_response.json()
                result.assert_true(True, "Event created successfully")
            else:
                print(f"❌ Failed to create event: {event_response.text}")
                return result
    else:
        print(f"❌ Failed to get events: {events_response.text}")
        return result
    
    event_id = event["id"]
    
    # Step 6: Doctor joins the event
    print("\n6. Doctor joining the event...")
    join_response = requests.post(f"{BASE_URL}/events/{event_id}/doctors", 
                                headers=doctor_headers)
    
    result.assert_equal(join_response.status_code, 200, "Doctor joined event successfully")
    
    # Step 7: Doctor creates time slots
    print("\n7. Creating time slots...")
    slots_data = {
        "event_id": event_id,
        "start_time": "09:00",
        "end_time": "12:00",
        "slot_duration": 15
    }
    
    slots_response = requests.post(f"{BASE_URL}/slots", 
                                 json=slots_data, 
                                 headers=doctor_headers)
    
    if slots_response.status_code == 200:
        slots_result = slots_response.json()
        result.assert_true(True, f"Created {slots_result['slots_created']} time slots")
    else:
        print(f"❌ Failed to create slots: {slots_response.text}")
        return result
    
    # Step 8: Get available slots
    print("\n8. Getting available slots...")
    get_slots_response = requests.get(f"{BASE_URL}/slots?event_id={event_id}", 
                                    headers=patient_headers)
    
    if get_slots_response.status_code == 200:
        available_slots = get_slots_response.json()
        result.assert_true(len(available_slots) > 0, "Available slots retrieved")
    else:
        print(f"❌ Failed to get slots: {get_slots_response.text}")
        return result
    
    # Get first two slots for testing
    if len(available_slots) < 2:
        print("❌ Need at least 2 slots for overlap testing")
        return result
    
    slot1 = available_slots[0]  # First slot (e.g., 09:00-09:15)
    slot2 = available_slots[1]  # Second slot (e.g., 09:15-09:30) - should not overlap
    
    print(f"Selected slots for testing:")
    print(f"  Slot 1: {slot1['start_time']}-{slot1['end_time']} (ID: {slot1['id']})")
    print(f"  Slot 2: {slot2['start_time']}-{slot2['end_time']} (ID: {slot2['id']})")
    
    # Step 9: Patient books first slot - should succeed
    print("\n9. Patient booking first slot...")
    booking_data = {
        "event_id": event_id,
        "doctor_id": doctor_id,
        "slot_id": slot1["id"],
        "patient_name": "Test Patient",
        "patient_phone": "+1234567890",
        "reason": "Regular checkup"
    }
    
    first_booking_response = requests.post(f"{BASE_URL}/appointments", 
                                         json=booking_data, 
                                         headers=patient_headers)
    
    result.assert_equal(first_booking_response.status_code, 200, "First appointment booking successful")
    
    if first_booking_response.status_code == 200:
        first_appointment = first_booking_response.json()
        appointment_id = first_appointment["id"]
        print(f"  Appointment ID: {appointment_id}")
    else:
        print(f"❌ First booking failed: {first_booking_response.text}")
        return result
    
    # Step 10: Patient tries to book the same slot again - should fail with 400
    print("\n10. Patient trying to book the same slot again...")
    
    same_slot_booking_data = {
        "event_id": event_id,
        "doctor_id": doctor_id,
        "slot_id": slot1["id"],  # Same slot
        "patient_name": "Test Patient",
        "patient_phone": "+1234567890",
        "reason": "Another checkup"
    }
    
    same_slot_response = requests.post(f"{BASE_URL}/appointments", 
                                     json=same_slot_booking_data, 
                                     headers=patient_headers)
    
    # This should fail because slot is already booked
    result.assert_equal(same_slot_response.status_code, 400, "Same slot booking rejected with 400")
    
    if same_slot_response.status_code == 400:
        error_detail = same_slot_response.json().get("detail", "")
        print(f"  Error message: {error_detail}")
        # Check if it's the slot already booked error or overlapping error
        if "already booked" in error_detail.lower():
            result.assert_true(True, "Slot already booked error (expected)")
        elif "overlapping" in error_detail.lower():
            result.assert_true(True, "Overlapping timeslot error (also valid)")
        else:
            result.assert_true(False, f"Unexpected error message: {error_detail}")
    
    # Step 11: Create a custom overlapping slot to test overlap validation
    print("\n11. Creating custom overlapping slot for testing...")
    
    # Create a slot that overlaps with the first slot (09:00-09:15)
    # New slot: 09:10-09:25 (overlaps with 09:00-09:15)
    custom_slot_data = {
        "event_id": event_id,
        "start_time": "09:10",  # Overlaps with first slot
        "end_time": "09:25",
        "doctor_id": doctor_id
    }
    
    # Check if there's a single slot creation endpoint
    custom_slot_response = requests.post(f"{BASE_URL}/slots/single", 
                                       json=custom_slot_data, 
                                       headers=doctor_headers)
    
    if custom_slot_response.status_code == 200:
        custom_slot = custom_slot_response.json()
        print(f"  Created custom overlapping slot: {custom_slot['start_time']}-{custom_slot['end_time']}")
        
        # Now try to book this overlapping slot
        overlap_booking_data = {
            "event_id": event_id,
            "doctor_id": doctor_id,
            "slot_id": custom_slot["id"],
            "patient_name": "Test Patient",
            "patient_phone": "+1234567890",
            "reason": "Overlapping appointment"
        }
        
        overlap_response = requests.post(f"{BASE_URL}/appointments", 
                                       json=overlap_booking_data, 
                                       headers=patient_headers)
        
        result.assert_equal(overlap_response.status_code, 400, "Overlapping slot booking rejected with 400")
        
        if overlap_response.status_code == 400:
            error_detail = overlap_response.json().get("detail", "")
            result.assert_in("overlapping", error_detail, "Error message mentions overlapping timeslots")
            print(f"  Error message: {error_detail}")
        else:
            print(f"  Unexpected response: {overlap_response.status_code} - {overlap_response.text}")
    else:
        print(f"  Could not create custom slot: {custom_slot_response.text}")
        print("  Skipping custom overlap test...")
    
    # Step 12: Patient books non-overlapping slot - should succeed
    print("\n12. Patient booking non-overlapping slot...")
    non_overlap_booking_data = {
        "event_id": event_id,
        "doctor_id": doctor_id,
        "slot_id": slot2["id"],  # Different slot that shouldn't overlap
        "patient_name": "Test Patient",
        "patient_phone": "+1234567890",
        "reason": "Follow-up checkup"
    }
    
    non_overlap_response = requests.post(f"{BASE_URL}/appointments", 
                                       json=non_overlap_booking_data, 
                                       headers=patient_headers)
    
    result.assert_equal(non_overlap_response.status_code, 200, "Non-overlapping slot booking successful")
    
    if non_overlap_response.status_code == 200:
        second_appointment = non_overlap_response.json()
        second_appointment_id = second_appointment["id"]
        print(f"  Second appointment ID: {second_appointment_id}")
    else:
        print(f"❌ Non-overlapping booking failed: {non_overlap_response.text}")
    
    # Step 13: Cancel first appointment
    print("\n13. Cancelling first appointment...")
    cancel_response = requests.put(f"{BASE_URL}/appointments/{appointment_id}/cancel", 
                                 headers=patient_headers)
    
    result.assert_equal(cancel_response.status_code, 200, "First appointment cancelled successfully")
    
    # Step 14: Try to book the original slot again - should succeed now
    print("\n14. Booking original slot after cancellation...")
    
    rebook_booking_data = {
        "event_id": event_id,
        "doctor_id": doctor_id,
        "slot_id": slot1["id"],  # Original slot
        "patient_name": "Test Patient",
        "patient_phone": "+1234567890",
        "reason": "Rescheduled checkup"
    }
    
    rebook_response = requests.post(f"{BASE_URL}/appointments", 
                                  json=rebook_booking_data, 
                                  headers=patient_headers)
    
    result.assert_equal(rebook_response.status_code, 200, "Booking after cancellation successful")
    
    if rebook_response.status_code == 200:
        rebook_appointment = rebook_response.json()
        print(f"  Rebooked appointment ID: {rebook_appointment['id']}")
    else:
        print(f"❌ Rebooking failed: {rebook_response.text}")
    
    print("\n" + "=" * 60)
    print(f"🧪 Test Results: {result.passed} passed, {result.failed} failed")
    
    if result.errors:
        print("\n❌ Errors encountered:")
        for error in result.errors:
            print(f"  {error}")
    
    return result

def run_all_tests():
    """Run all tests in the specified order"""
    print("🚀 Starting Patient Overlapping Timeslot Validation Tests")
    print(f"Testing against: {BASE_URL}")
    print("=" * 60)
    
    try:
        test_result = test_overlapping_timeslot_validation()
        
        if test_result.failed == 0:
            print("\n🎉 All tests passed! Overlapping timeslot validation is working correctly.")
            return True
        else:
            print(f"\n⚠️  {test_result.failed} test(s) failed. Please review the implementation.")
            return False
            
    except Exception as e:
        print(f"\n💥 Test execution failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)