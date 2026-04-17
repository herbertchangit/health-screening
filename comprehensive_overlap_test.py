#!/usr/bin/env python3
"""
Comprehensive test for Patient Overlapping Timeslot Validation feature
This test specifically validates the overlap detection logic for same-date appointments
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

def create_event_and_setup(admin_token, doctor_token, event_date):
    """Create event and setup doctor with slots"""
    # Create event
    event_data = {
        "name": f"Overlap Test Event {event_date.strftime('%Y%m%d')}",
        "description": "Testing overlapping timeslot validation",
        "location": "Test Clinic",
        "address": "123 Test Street",
        "event_date": event_date.isoformat(),
        "start_time": "09:00",
        "end_time": "17:00",
        "max_capacity": 50
    }
    
    response = requests.post(f"{BASE_URL}/events", 
                           json=event_data, 
                           headers=get_auth_headers(admin_token))
    
    if response.status_code != 200:
        print(f"❌ Event creation failed: {response.text}")
        return None, None
    
    event_id = response.json()["id"]
    
    # Get doctor profile
    response = requests.get(f"{BASE_URL}/doctors/profile", 
                          headers=get_auth_headers(doctor_token))
    
    if response.status_code != 200:
        print(f"❌ Get doctor profile failed: {response.text}")
        return None, None
    
    doctor_id = response.json()["id"]
    
    # Doctor joins event
    response = requests.post(f"{BASE_URL}/events/{event_id}/join", 
                           headers=get_auth_headers(doctor_token))
    
    if response.status_code != 200:
        print(f"❌ Doctor join event failed: {response.text}")
        return None, None
    
    # Create slots
    slots_data = {
        "event_id": event_id,
        "start_time": "09:00",
        "end_time": "12:00",
        "slot_duration_minutes": 30  # Using 30-minute slots for clearer testing
    }
    
    response = requests.post(f"{BASE_URL}/slots/bulk", 
                           json=slots_data, 
                           headers=get_auth_headers(doctor_token))
    
    if response.status_code != 200:
        print(f"❌ Bulk slot creation failed: {response.text}")
        return None, None
    
    return event_id, doctor_id

def test_comprehensive_overlap_validation():
    """Test comprehensive overlapping timeslot validation scenarios"""
    print("🧪 Testing Comprehensive Patient Overlapping Timeslot Validation")
    print("=" * 70)
    
    # Login all users
    print("\n📋 Step 1: Login All Users")
    admin_token = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    doctor_token = login_user(DOCTOR_EMAIL, DOCTOR_PASSWORD)
    patient_token = login_user(PATIENT_EMAIL, PATIENT_PASSWORD)
    
    if not all([admin_token, doctor_token, patient_token]):
        return False
    print("✅ All users logged in successfully")
    
    # Test Scenario 1: Same date overlap validation
    print("\n📋 Scenario 1: Same Date Overlap Validation")
    same_date = datetime.now() + timedelta(days=7)
    event1_id, doctor_id = create_event_and_setup(admin_token, doctor_token, same_date)
    
    if not event1_id or not doctor_id:
        return False
    
    print(f"✅ Created event {event1_id} for date {same_date.strftime('%Y-%m-%d')}")
    
    # Get available slots for this event
    response = requests.get(f"{BASE_URL}/events/{event1_id}/doctors/{doctor_id}/slots?available_only=true")
    if response.status_code != 200:
        print(f"❌ Get available slots failed: {response.text}")
        return False
    
    slots = response.json()
    print(f"✅ Available slots: {len(slots)}")
    
    if len(slots) < 2:
        print("❌ Need at least 2 slots for testing")
        return False
    
    # Book first slot (09:00-09:30)
    first_slot = slots[0]
    print(f"Booking first slot: {first_slot['start_time']} - {first_slot['end_time']}")
    
    appointment_data = {
        "doctor_id": doctor_id,
        "event_id": event1_id,
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
    print(f"✅ First appointment booked: {first_appointment['id']}")
    
    # Test Scenario 2: Different date - should succeed
    print("\n📋 Scenario 2: Different Date (Should Succeed)")
    different_date = datetime.now() + timedelta(days=14)  # Different date
    event2_id, doctor2_id = create_event_and_setup(admin_token, doctor_token, different_date)
    
    if not event2_id:
        return False
    
    print(f"✅ Created second event {event2_id} for date {different_date.strftime('%Y-%m-%d')}")
    
    # Get slots for second event
    response = requests.get(f"{BASE_URL}/events/{event2_id}/doctors/{doctor2_id}/slots?available_only=true")
    if response.status_code != 200:
        print(f"❌ Get available slots for second event failed: {response.text}")
        return False
    
    slots2 = response.json()
    
    # Book same time slot on different date (should succeed)
    same_time_slot = slots2[0]  # Same time (09:00-09:30) but different date
    print(f"Booking same time on different date: {same_time_slot['start_time']} - {same_time_slot['end_time']}")
    
    appointment_data2 = {
        "doctor_id": doctor2_id,
        "event_id": event2_id,
        "slot_id": same_time_slot["id"],
        "patient_name": "Sarah Johnson",
        "patient_phone": "+1234567890",
        "reason": "Regular checkup on different date"
    }
    
    response = requests.post(f"{BASE_URL}/appointments", 
                           json=appointment_data2, 
                           headers=get_auth_headers(patient_token))
    
    if response.status_code != 200:
        print(f"❌ Same time different date booking failed: {response.text}")
        return False
    
    print("✅ Same time slot on different date booked successfully")
    
    # Test Scenario 3: Create overlapping slots on same date and test validation
    print("\n📋 Scenario 3: Test Actual Overlap Validation on Same Date")
    
    # Create another doctor to have overlapping slots on the same event
    # First, let's create a second doctor account for testing
    print("Creating second doctor for overlap testing...")
    
    # Register second doctor
    doctor2_data = {
        "email": "doctor2@test.com",
        "password": "doctor123",
        "full_name": "Dr. Jane Smith",
        "role": "doctor"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=doctor2_data)
    if response.status_code == 200:
        doctor2_token = response.json()["access_token"]
        print("✅ Second doctor registered")
    else:
        # Doctor might already exist, try to login
        doctor2_token = login_user("doctor2@test.com", "doctor123")
        if doctor2_token:
            print("✅ Second doctor logged in (already existed)")
        else:
            print("❌ Could not create/login second doctor")
            return False
    
    # Create doctor profile for second doctor
    profile_data = {
        "specialization": "Cardiology",
        "qualification": "MD, Cardiology",
        "experience_years": 8,
        "bio": "Experienced cardiologist",
        "consultation_fee": 150.0
    }
    
    response = requests.post(f"{BASE_URL}/doctors/profile", 
                           json=profile_data, 
                           headers=get_auth_headers(doctor2_token))
    
    if response.status_code == 200:
        doctor2_profile = response.json()
        doctor2_id = doctor2_profile["id"]
        print(f"✅ Second doctor profile created: {doctor2_id}")
    elif response.status_code == 400 and "already exists" in response.text:
        # Profile already exists, get it
        response = requests.get(f"{BASE_URL}/doctors/profile", 
                              headers=get_auth_headers(doctor2_token))
        if response.status_code == 200:
            doctor2_profile = response.json()
            doctor2_id = doctor2_profile["id"]
            print(f"✅ Second doctor profile exists: {doctor2_id}")
        else:
            print(f"❌ Could not get second doctor profile: {response.text}")
            return False
    else:
        print(f"❌ Could not create second doctor profile: {response.text}")
        return False
    
    # Second doctor joins the same event
    response = requests.post(f"{BASE_URL}/events/{event1_id}/join", 
                           headers=get_auth_headers(doctor2_token))
    
    if response.status_code != 200:
        print(f"❌ Second doctor join event failed: {response.text}")
        return False
    
    # Create overlapping slots with second doctor (same times)
    slots_data2 = {
        "event_id": event1_id,
        "start_time": "09:00",  # Same time as first doctor
        "end_time": "12:00",
        "slot_duration_minutes": 30
    }
    
    response = requests.post(f"{BASE_URL}/slots/bulk", 
                           json=slots_data2, 
                           headers=get_auth_headers(doctor2_token))
    
    if response.status_code != 200:
        print(f"❌ Second doctor slot creation failed: {response.text}")
        return False
    
    print("✅ Second doctor created overlapping time slots")
    
    # Get second doctor's slots
    response = requests.get(f"{BASE_URL}/events/{event1_id}/doctors/{doctor2_id}/slots?available_only=true")
    if response.status_code != 200:
        print(f"❌ Get second doctor slots failed: {response.text}")
        return False
    
    doctor2_slots = response.json()
    
    # Try to book overlapping slot with second doctor (should fail due to overlap validation)
    overlapping_slot = doctor2_slots[0]  # Same time as already booked appointment
    print(f"Trying to book overlapping slot with second doctor: {overlapping_slot['start_time']} - {overlapping_slot['end_time']}")
    
    overlap_appointment_data = {
        "doctor_id": doctor2_id,
        "event_id": event1_id,
        "slot_id": overlapping_slot["id"],
        "patient_name": "Sarah Johnson",
        "patient_phone": "+1234567890",
        "reason": "Overlapping appointment test"
    }
    
    response = requests.post(f"{BASE_URL}/appointments", 
                           json=overlap_appointment_data, 
                           headers=get_auth_headers(patient_token))
    
    if response.status_code == 400:
        response_text = response.text
        if "overlap" in response_text.lower():
            print(f"✅ Overlap validation working correctly: {response_text}")
        else:
            print(f"⚠️  Got 400 but not overlap error: {response_text}")
    else:
        print(f"❌ Expected overlap validation to fail, got {response.status_code}: {response.text}")
        return False
    
    # Test Scenario 4: Cancel appointment and try overlap again
    print("\n📋 Scenario 4: Cancel and Retry Overlap")
    
    # Cancel the first appointment
    response = requests.put(f"{BASE_URL}/appointments/{first_appointment['id']}/cancel", 
                          headers=get_auth_headers(patient_token))
    
    if response.status_code != 200:
        print(f"❌ Cancel appointment failed: {response.text}")
        return False
    
    print("✅ First appointment cancelled")
    
    # Now try to book the overlapping slot again (should succeed)
    response = requests.post(f"{BASE_URL}/appointments", 
                           json=overlap_appointment_data, 
                           headers=get_auth_headers(patient_token))
    
    if response.status_code == 200:
        print("✅ Booking overlapping slot after cancellation succeeded")
    else:
        print(f"❌ Booking after cancellation failed: {response.text}")
        return False
    
    print("\n" + "=" * 70)
    print("✅ All overlap validation scenarios tested successfully!")
    return True

def main():
    """Main test execution"""
    print("🚀 Starting Comprehensive Patient Overlapping Timeslot Validation Test")
    print(f"🌐 Testing against: {BASE_URL}")
    
    try:
        success = test_comprehensive_overlap_validation()
        
        if success:
            print("\n🎉 All comprehensive overlap validation tests passed!")
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