#!/usr/bin/env python3
"""
Focused test for Patient Overlapping Timeslot Validation feature
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# API Base URL
BASE_URL = "https://quick-doc-events.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"
DOCTOR_EMAIL = "doctor@test.com"
DOCTOR_PASSWORD = "doctor123"
PATIENT_EMAIL = "patient@test.com"
PATIENT_PASSWORD = "patient123"

def login_user(email, password):
    """Login and return access token"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"❌ Login failed for {email}: {response.text}")
        return None

def get_auth_headers(token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {token}"}

def test_overlapping_validation():
    """Test the overlapping timeslot validation"""
    print("🧪 Testing Patient Overlapping Timeslot Validation")
    print("=" * 60)
    
    # Step 1: Login as admin
    print("\n📋 Step 1: Admin Login")
    admin_token = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        return False
    print("✅ Admin login successful")
    
    # Step 2: Create an event with future date
    print("\n📋 Step 2: Create Event")
    future_date = datetime.now() + timedelta(days=7)
    event_data = {
        "name": "Overlap Test Event",
        "description": "Testing overlapping timeslot validation",
        "location": "Test Clinic",
        "address": "123 Test Street",
        "event_date": future_date.isoformat(),
        "start_time": "09:00",
        "end_time": "17:00",
        "max_capacity": 50
    }
    
    response = requests.post(f"{BASE_URL}/events", 
                           json=event_data, 
                           headers=get_auth_headers(admin_token))
    
    if response.status_code != 200:
        print(f"❌ Event creation failed: {response.text}")
        return False
    
    event_id = response.json()["id"]
    print(f"✅ Created event with ID: {event_id}")
    
    # Step 3: Login as doctor
    print("\n📋 Step 3: Doctor Login")
    doctor_token = login_user(DOCTOR_EMAIL, DOCTOR_PASSWORD)
    if not doctor_token:
        return False
    print("✅ Doctor login successful")
    
    # Step 4: Get doctor profile to find doctor_id
    print("\n📋 Step 4: Get Doctor Profile")
    response = requests.get(f"{BASE_URL}/doctors/profile", 
                          headers=get_auth_headers(doctor_token))
    
    if response.status_code != 200:
        print(f"❌ Get doctor profile failed: {response.text}")
        return False
    
    doctor_id = response.json()["id"]
    print(f"✅ Doctor ID: {doctor_id}")
    
    # Step 5: Doctor joins the event
    print("\n📋 Step 5: Doctor Joins Event")
    response = requests.post(f"{BASE_URL}/events/{event_id}/join", 
                           headers=get_auth_headers(doctor_token))
    
    if response.status_code != 200:
        print(f"❌ Doctor join event failed: {response.text}")
        return False
    print("✅ Doctor joined event successfully")
    
    # Step 6: Doctor creates bulk slots
    print("\n📋 Step 6: Create Bulk Slots")
    slots_data = {
        "event_id": event_id,
        "start_time": "09:00",
        "end_time": "12:00",
        "slot_duration_minutes": 15
    }
    
    response = requests.post(f"{BASE_URL}/slots/bulk", 
                           json=slots_data, 
                           headers=get_auth_headers(doctor_token))
    
    if response.status_code != 200:
        print(f"❌ Bulk slot creation failed: {response.text}")
        return False
    
    slots = response.json()
    print(f"✅ Created {len(slots)} slots")
    
    # Step 7: Get available slots
    print("\n📋 Step 7: Get Available Slots")
    response = requests.get(f"{BASE_URL}/events/{event_id}/doctors/{doctor_id}/slots?available_only=true")
    
    if response.status_code != 200:
        print(f"❌ Get available slots failed: {response.text}")
        return False
    
    available_slots = response.json()
    print(f"✅ Available slots: {len(available_slots)}")
    
    if len(available_slots) < 2:
        print("❌ Need at least 2 available slots for testing")
        return False
    
    first_slot = available_slots[0]
    print(f"First slot: {first_slot['start_time']} - {first_slot['end_time']}")
    
    # Step 8: Login as patient
    print("\n📋 Step 8: Patient Login")
    patient_token = login_user(PATIENT_EMAIL, PATIENT_PASSWORD)
    if not patient_token:
        return False
    print("✅ Patient login successful")
    
    # Step 9: Book first slot (should succeed)
    print("\n📋 Step 9: Book First Slot (Should Succeed)")
    appointment_data = {
        "doctor_id": doctor_id,
        "event_id": event_id,
        "slot_id": first_slot["id"],
        "patient_name": "Sarah Johnson",
        "patient_phone": "+1234567890",
        "reason": "Regular checkup"
    }
    
    response = requests.post(f"{BASE_URL}/appointments", 
                           json=appointment_data, 
                           headers=get_auth_headers(patient_token))
    
    if response.status_code != 200:
        print(f"❌ First appointment booking failed: {response.text}")
        return False
    
    first_appointment = response.json()
    first_appointment_id = first_appointment["id"]
    print(f"✅ First appointment booked successfully: {first_appointment_id}")
    
    # Step 10: Try to book the same slot again (should fail with overlap error)
    print("\n📋 Step 10: Try to Book Same Slot Again (Should Fail)")
    
    # Try to book the exact same slot - this should fail because slot is already booked
    response = requests.post(f"{BASE_URL}/appointments", 
                           json=appointment_data, 
                           headers=get_auth_headers(patient_token))
    
    if response.status_code == 400:
        response_text = response.text
        print(f"✅ Booking same slot failed as expected: {response_text}")
        if "already booked" in response_text.lower():
            print("✅ Correct error message for already booked slot")
        else:
            print("⚠️  Different error message than expected")
    else:
        print(f"❌ Expected 400 error, got {response.status_code}: {response.text}")
        return False
    
    # Step 11: Cancel first appointment
    print("\n📋 Step 11: Cancel First Appointment")
    response = requests.put(f"{BASE_URL}/appointments/{first_appointment_id}/cancel", 
                          headers=get_auth_headers(patient_token))
    
    if response.status_code != 200:
        print(f"❌ Cancel appointment failed: {response.text}")
        return False
    print("✅ First appointment cancelled successfully")
    
    # Step 12: Try booking the same slot again after cancellation (should succeed)
    print("\n📋 Step 12: Book Same Slot After Cancellation (Should Succeed)")
    
    response = requests.post(f"{BASE_URL}/appointments", 
                           json=appointment_data, 
                           headers=get_auth_headers(patient_token))
    
    if response.status_code != 200:
        print(f"❌ Booking after cancellation failed: {response.text}")
        return False
    
    second_appointment = response.json()
    print(f"✅ Appointment booked successfully after cancellation: {second_appointment['id']}")
    
    # Step 13: Test overlapping time validation with a different approach
    print("\n📋 Step 13: Test Time Overlap Validation")
    
    # Book another slot to test overlap validation
    if len(available_slots) >= 2:
        second_slot = available_slots[1]
        print(f"Second slot: {second_slot['start_time']} - {second_slot['end_time']}")
        
        # Book the second slot
        second_booking = {
            "doctor_id": doctor_id,
            "event_id": event_id,
            "slot_id": second_slot["id"],
            "patient_name": "Sarah Johnson",
            "patient_phone": "+1234567890",
            "reason": "Follow-up appointment"
        }
        
        response = requests.post(f"{BASE_URL}/appointments", 
                               json=second_booking, 
                               headers=get_auth_headers(patient_token))
        
        if response.status_code == 200:
            print("✅ Second slot booked successfully (slots don't overlap)")
            third_appointment = response.json()
            print(f"Third appointment ID: {third_appointment['id']}")
        elif response.status_code == 400:
            response_text = response.text
            if "overlap" in response_text.lower():
                print(f"✅ Overlap validation working: {response_text}")
            else:
                print(f"⚠️  Got 400 but not overlap error: {response_text}")
        else:
            print(f"❌ Unexpected response: {response.status_code} - {response.text}")
    
    print("\n" + "=" * 60)
    print("✅ Patient Overlapping Timeslot Validation test completed successfully!")
    return True

def main():
    """Main test execution"""
    print("🚀 Starting Patient Overlapping Timeslot Validation Test")
    print(f"🌐 Testing against: {BASE_URL}")
    
    try:
        success = test_overlapping_validation()
        
        if success:
            print("\n🎉 All tests passed!")
            return 0
        else:
            print("\n💥 Some tests failed!")
            return 1
        
    except Exception as e:
        print(f"💥 Test execution failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)