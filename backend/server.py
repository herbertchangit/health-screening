from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import base64
import qrcode
from io import BytesIO
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development').lower()

# MongoDB connection. Local preview builds can opt into an isolated in-memory
# database without changing production persistence behavior.
USE_IN_MEMORY_DB = os.environ.get('USE_IN_MEMORY_DB', '').lower() in {'1', 'true', 'yes'}
if USE_IN_MEMORY_DB:
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
else:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'talkwithdoc_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', '')
UNSAFE_JWT_SECRETS = {
    'super-secret-key-change-in-production',
    'replace-with-a-long-random-secret',
}
if ENVIRONMENT == 'production' and (
    not JWT_SECRET or JWT_SECRET in UNSAFE_JWT_SECRETS or len(JWT_SECRET) < 32
):
    raise RuntimeError('JWT_SECRET must be set to a strong value in production.')
if not JWT_SECRET:
    JWT_SECRET = 'super-secret-key-change-in-production'
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Talk with Doc API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRole:
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"

# User Models
class UserBase(BaseModel):
    email: str
    full_name: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None  # Base64 encoded
    role: str = UserRole.PATIENT

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    role: str
    is_active: bool

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Doctor Profile Models
class DoctorDutySlot(BaseModel):
    day_of_week: str
    start_time: str  # HH:MM format
    end_time: str    # HH:MM format
    slot_duration_minutes: int = 15

class DoctorProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    specialization: str
    qualification: str
    experience_years: int
    bio: Optional[str] = None
    profile_image: Optional[str] = None  # Base64 encoded
    consultation_fee: float = 0.0
    duty_slots: List[DoctorDutySlot] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DoctorProfileCreate(BaseModel):
    specialization: str
    qualification: str
    experience_years: int
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    consultation_fee: float = 0.0
    duty_slots: List[DoctorDutySlot] = Field(default_factory=list)

class DoctorProfileResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    email: str
    specialization: str
    qualification: str
    experience_years: int
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    consultation_fee: float
    duty_slots: List[DoctorDutySlot] = Field(default_factory=list)

# Event Models
class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    location: str
    address: str
    maps_url: Optional[str] = None
    waze_url: Optional[str] = None
    event_date: datetime
    start_time: str  # HH:MM format
    end_time: str    # HH:MM format
    banner_image: Optional[str] = None  # Base64 encoded
    max_capacity: int = 100
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    client_request_id: Optional[str] = None

class EventCreate(BaseModel):
    name: str
    description: str
    location: str
    address: str
    maps_url: Optional[str] = None
    waze_url: Optional[str] = None
    event_date: datetime
    start_time: str
    end_time: str
    banner_image: Optional[str] = None
    max_capacity: int = 100
    client_request_id: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    maps_url: Optional[str] = None
    waze_url: Optional[str] = None
    event_date: Optional[datetime] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    banner_image: Optional[str] = None
    max_capacity: Optional[int] = None
    is_active: Optional[bool] = None

# Event-Doctor Assignment
class EventDoctor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    doctor_id: str
    assigned_at: datetime = Field(default_factory=datetime.utcnow)

# Time Slot Models
class TimeSlot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    doctor_id: str
    start_time: str  # HH:MM format
    end_time: str    # HH:MM format
    slot_duration_minutes: int = 15
    is_booked: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TimeSlotCreate(BaseModel):
    event_id: str
    start_time: str
    end_time: str
    slot_duration_minutes: int = 15

class TimeSlotBulkCreate(BaseModel):
    event_id: str
    start_time: str
    end_time: str
    slot_duration_minutes: int = 15

def get_event_weekday_name(event: dict) -> Optional[str]:
    event_date = event.get("event_date")
    if isinstance(event_date, datetime):
        return event_date.strftime("%A")
    if isinstance(event_date, str):
        try:
            return datetime.fromisoformat(event_date.replace("Z", "+00:00")).strftime("%A")
        except ValueError:
            return None
    return None

async def ensure_event_slots_from_doctor_duty(event: dict, doctor: dict) -> int:
    """Create event-specific appointment slots from a doctor's saved duty slots.

    Existing slots with the same event, doctor, start, and end time are left as-is
    so repeated assignment/fetches do not duplicate appointment choices.
    """
    duty_slots = doctor.get("duty_slots") or []
    if not duty_slots:
        return 0

    event_weekday = get_event_weekday_name(event)
    matching_duty_slots = [
        slot for slot in duty_slots
        if not event_weekday or slot.get("day_of_week") == event_weekday
    ]
    if not matching_duty_slots:
        matching_duty_slots = duty_slots

    created_count = 0
    for duty_slot in matching_duty_slots:
        start_time = duty_slot.get("start_time")
        end_time = duty_slot.get("end_time")
        if not start_time or not end_time:
            continue

        existing = await db.time_slots.find_one({
            "event_id": event["id"],
            "doctor_id": doctor["id"],
            "start_time": start_time,
            "end_time": end_time,
        })
        if existing:
            continue

        slot = TimeSlot(
            event_id=event["id"],
            doctor_id=doctor["id"],
            start_time=start_time,
            end_time=end_time,
            slot_duration_minutes=duty_slot.get("slot_duration_minutes", 15)
        )
        await db.time_slots.insert_one(slot.dict())
        created_count += 1

    return created_count

# Appointment Models
class AppointmentStatus:
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class Appointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    doctor_id: str
    event_id: str
    slot_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    reason: Optional[str] = None
    status: str = AppointmentStatus.CONFIRMED
    qr_code: Optional[str] = None  # Base64 encoded QR
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AppointmentCreate(BaseModel):
    doctor_id: str
    event_id: str
    slot_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    reason: Optional[str] = None

# Notification Models
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str  # appointment, event, system
    reference_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str
    reference_id: Optional[str] = None


# News / Article Models
class NewsCategory:
    ANNOUNCEMENT = "announcement"
    PROMOTION = "promotion"
    ALERT = "alert"
    GENERAL = "general"

class NewsPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    summary: str
    content: str
    thumbnail: Optional[str] = None  # Base64 encoded image
    category: str = NewsCategory.GENERAL
    is_pinned: bool = False
    is_urgent: bool = False
    is_published: bool = True
    publish_date: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = ""
    author_name: str = ""
    view_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class NewsCreate(BaseModel):
    title: str
    summary: str
    content: str
    thumbnail: Optional[str] = None
    category: str = NewsCategory.GENERAL
    is_pinned: bool = False
    is_urgent: bool = False
    is_published: bool = True
    publish_date: Optional[str] = None  # ISO format string

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    thumbnail: Optional[str] = None
    category: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_urgent: Optional[bool] = None
    is_published: Optional[bool] = None
    publish_date: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def generate_qr_code(data: dict) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(json.dumps(data))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

async def create_notification(user_id: str, title: str, message: str, notif_type: str, reference_id: str = None):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        reference_id=reference_id
    )
    await db.notifications.insert_one(notification.dict())
    return notification

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.dict()
    user_dict["email"] = user_dict["email"].lower()
    user_dict["password"] = hash_password(user_dict["password"])
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    user_dict["is_active"] = True
    
    await db.users.insert_one(user_dict)
    
    # Generate token
    token = create_access_token(user_dict["id"], user_dict["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            full_name=user_dict["full_name"],
            phone=user_dict.get("phone"),
            profile_image=user_dict.get("profile_image"),
            role=user_dict["role"],
            is_active=user_dict["is_active"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"email": login_data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    token = create_access_token(user["id"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            phone=user.get("phone"),
            profile_image=user.get("profile_image"),
            role=user["role"],
            is_active=user.get("is_active", True)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        phone=current_user.get("phone"),
        profile_image=current_user.get("profile_image"),
        role=current_user["role"],
        is_active=current_user.get("is_active", True)
    )

@api_router.put("/auth/me", response_model=UserResponse)
async def update_me(profile_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}

    if "full_name" in update_data:
        update_data["full_name"] = update_data["full_name"].strip()
        if not update_data["full_name"]:
            raise HTTPException(status_code=400, detail="Full name is required")

    if "phone" in update_data:
        update_data["phone"] = update_data["phone"].strip() or None

    if "profile_image" in update_data:
        update_data["profile_image"] = update_data["profile_image"].strip() or None

    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})

    updated = await db.users.find_one({"id": current_user["id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=updated["id"],
        email=updated["email"],
        full_name=updated["full_name"],
        phone=updated.get("phone"),
        profile_image=updated.get("profile_image"),
        role=updated["role"],
        is_active=updated.get("is_active", True)
    )

@api_router.delete("/auth/me")
async def delete_me(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patient profiles can be deleted here")

    user_id = current_user["id"]

    appointments = await db.appointments.find({"patient_id": user_id}).to_list(1000)
    for appointment in appointments:
        slot_id = appointment.get("slot_id")
        if slot_id and appointment.get("status") not in ["cancelled", "completed"]:
            await db.time_slots.update_one({"id": slot_id}, {"$set": {"is_booked": False}})

    await db.appointments.delete_many({"patient_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})

    return {"message": "Profile deleted"}

# ==================== EVENTS ENDPOINTS ====================

@api_router.get("/events", response_model=List[Event])
async def get_events(active_only: bool = True):
    query = {"is_active": True} if active_only else {}
    events = await db.events.find(query).sort("event_date", 1).to_list(100)
    return [Event(**event) for event in events]

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return Event(**event)

@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create events")
    
    if event_data.client_request_id:
        existing = await db.events.find_one({
            "client_request_id": event_data.client_request_id,
            "created_by": current_user["id"],
        })
        if existing:
            return Event(**existing)

    event = Event(
        **event_data.dict(),
        created_by=current_user["id"]
    )
    try:
        await db.events.insert_one(event.dict())
    except DuplicateKeyError:
        existing = await db.events.find_one({"client_request_id": event_data.client_request_id})
        if existing:
            return Event(**existing)
        raise
    return event

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event_data: EventUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update events")
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = {k: v for k, v in event_data.dict().items() if v is not None}
    if update_data:
        await db.events.update_one({"id": event_id}, {"$set": update_data})
    
    updated_event = await db.events.find_one({"id": event_id})
    return Event(**updated_event)

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete events")
    
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Also delete related data
    await db.event_doctors.delete_many({"event_id": event_id})
    await db.time_slots.delete_many({"event_id": event_id})
    
    return {"message": "Event deleted successfully"}

# ==================== DOCTOR PROFILE ENDPOINTS ====================

@api_router.post("/doctors/profile", response_model=DoctorProfile)
async def create_doctor_profile(profile_data: DoctorProfileCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can create doctor profiles")
    
    # Check if profile already exists
    existing = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    profile = DoctorProfile(
        **profile_data.dict(),
        user_id=current_user["id"]
    )
    await db.doctor_profiles.insert_one(profile.dict())
    return profile

@api_router.get("/doctors/profile", response_model=DoctorProfile)
async def get_my_doctor_profile(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can access this")
    
    profile = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return DoctorProfile(**profile)

@api_router.put("/doctors/profile", response_model=DoctorProfile)
async def update_doctor_profile(profile_data: DoctorProfileCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can update their profile")
    
    profile = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile_data.dict()
    await db.doctor_profiles.update_one({"user_id": current_user["id"]}, {"$set": update_data})
    
    updated = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
    return DoctorProfile(**updated)

@api_router.get("/doctors", response_model=List[DoctorProfileResponse])
async def get_all_doctors():
    profiles = await db.doctor_profiles.find().to_list(100)
    result = []
    for profile in profiles:
        user = await db.users.find_one({"id": profile["user_id"]})
        if user:
            result.append(DoctorProfileResponse(
                id=profile["id"],
                user_id=profile["user_id"],
                full_name=user["full_name"],
                email=user["email"],
                specialization=profile["specialization"],
                qualification=profile["qualification"],
                experience_years=profile["experience_years"],
                bio=profile.get("bio"),
                profile_image=profile.get("profile_image"),
                consultation_fee=profile.get("consultation_fee", 0.0),
                duty_slots=profile.get("duty_slots", [])
            ))
    return result

@api_router.get("/doctors/{doctor_id}", response_model=DoctorProfileResponse)
async def get_doctor(doctor_id: str):
    profile = await db.doctor_profiles.find_one({"id": doctor_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    user = await db.users.find_one({"id": profile["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Doctor user not found")
    
    return DoctorProfileResponse(
        id=profile["id"],
        user_id=profile["user_id"],
        full_name=user["full_name"],
        email=user["email"],
        specialization=profile["specialization"],
        qualification=profile["qualification"],
        experience_years=profile["experience_years"],
        bio=profile.get("bio"),
        profile_image=profile.get("profile_image"),
        consultation_fee=profile.get("consultation_fee", 0.0),
        duty_slots=profile.get("duty_slots", [])
    )

# ==================== EVENT-DOCTOR ASSIGNMENT ENDPOINTS ====================

@api_router.post("/events/{event_id}/doctors/{doctor_id}")
async def assign_doctor_to_event(event_id: str, doctor_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can assign doctors")
    
    # Verify event exists
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Verify doctor exists
    doctor = await db.doctor_profiles.find_one({"id": doctor_id})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check if already assigned
    existing = await db.event_doctors.find_one({"event_id": event_id, "doctor_id": doctor_id})
    if existing:
        raise HTTPException(status_code=400, detail="Doctor already assigned to this event")
    
    assignment = EventDoctor(event_id=event_id, doctor_id=doctor_id)
    await db.event_doctors.insert_one(assignment.dict())
    created_slots = await ensure_event_slots_from_doctor_duty(event, doctor)
    
    # Notify doctor
    await create_notification(
        doctor["user_id"],
        "New Event Assignment",
        f"You have been assigned to event: {event['name']}",
        "event",
        event_id
    )
    
    return {"message": "Doctor assigned successfully", "created_slots": created_slots}

@api_router.delete("/events/{event_id}/doctors/{doctor_id}")
async def remove_doctor_from_event(event_id: str, doctor_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can remove doctors")
    
    result = await db.event_doctors.delete_one({"event_id": event_id, "doctor_id": doctor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {"message": "Doctor removed from event"}

@api_router.get("/events/{event_id}/doctors", response_model=List[DoctorProfileResponse])
async def get_event_doctors(event_id: str):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get all doctor assignments for the event
    assignments = await db.event_doctors.find({"event_id": event_id}).to_list(100)
    doctor_ids = [a["doctor_id"] for a in assignments]
    
    result = []
    for doctor_id in doctor_ids:
        profile = await db.doctor_profiles.find_one({"id": doctor_id})
        if profile:
            existing_slots_count = await db.time_slots.count_documents({
                "event_id": event_id,
                "doctor_id": doctor_id
            })
            if existing_slots_count == 0:
                await ensure_event_slots_from_doctor_duty(event, profile)

            user = await db.users.find_one({"id": profile["user_id"]})
            if user:
                result.append(DoctorProfileResponse(
                    id=profile["id"],
                    user_id=profile["user_id"],
                    full_name=user["full_name"],
                    email=user["email"],
                    specialization=profile["specialization"],
                    qualification=profile["qualification"],
                    experience_years=profile["experience_years"],
                    bio=profile.get("bio"),
                    profile_image=profile.get("profile_image"),
                    consultation_fee=profile.get("consultation_fee", 0.0),
                    duty_slots=profile.get("duty_slots", [])
                ))
    return result

# Doctor self-join event endpoint
@api_router.post("/events/{event_id}/join")
async def doctor_join_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Allow doctors to join an event themselves"""
    if current_user["role"] != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can join events")
    
    # Verify event exists
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get doctor profile
    profile = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Please complete your doctor profile first")
    
    doctor_id = profile["id"]
    
    # Check if already assigned
    existing = await db.event_doctors.find_one({"event_id": event_id, "doctor_id": doctor_id})
    if existing:
        return {"message": "Already joined this event", "doctor_id": doctor_id}
    
    # Create assignment
    assignment = EventDoctor(event_id=event_id, doctor_id=doctor_id)
    await db.event_doctors.insert_one(assignment.dict())
    
    return {"message": "Successfully joined event", "doctor_id": doctor_id}

# Check if doctor is assigned to event
@api_router.get("/events/{event_id}/my-status")
async def get_doctor_event_status(event_id: str, current_user: dict = Depends(get_current_user)):
    """Check if current doctor is assigned to this event"""
    if current_user["role"] != UserRole.DOCTOR:
        return {"is_assigned": False, "has_profile": False}
    
    profile = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        return {"is_assigned": False, "has_profile": False, "doctor_id": None}
    
    doctor_id = profile["id"]
    assignment = await db.event_doctors.find_one({"event_id": event_id, "doctor_id": doctor_id})
    
    # Get slots count
    slots_count = await db.time_slots.count_documents({"event_id": event_id, "doctor_id": doctor_id})
    
    return {
        "is_assigned": assignment is not None,
        "has_profile": True,
        "doctor_id": doctor_id,
        "slots_count": slots_count
    }

# ==================== TIME SLOTS ENDPOINTS ====================

@api_router.post("/slots/bulk", response_model=List[TimeSlot])
async def create_bulk_slots(slot_data: TimeSlotBulkCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only doctors or admins can create slots")
    
    # Get doctor_id
    if current_user["role"] == UserRole.DOCTOR:
        profile = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
        if not profile:
            raise HTTPException(status_code=400, detail="Doctor profile not found")
        doctor_id = profile["id"]
    else:
        raise HTTPException(status_code=400, detail="Admin must specify doctor_id")
    
    # Parse times and generate slots
    start_hour, start_min = map(int, slot_data.start_time.split(':'))
    end_hour, end_min = map(int, slot_data.end_time.split(':'))
    
    start_minutes = start_hour * 60 + start_min
    end_minutes = end_hour * 60 + end_min
    
    slots = []
    current_minutes = start_minutes
    
    while current_minutes + slot_data.slot_duration_minutes <= end_minutes:
        slot_start = f"{current_minutes // 60:02d}:{current_minutes % 60:02d}"
        slot_end_min = current_minutes + slot_data.slot_duration_minutes
        slot_end = f"{slot_end_min // 60:02d}:{slot_end_min % 60:02d}"
        
        slot = TimeSlot(
            event_id=slot_data.event_id,
            doctor_id=doctor_id,
            start_time=slot_start,
            end_time=slot_end,
            slot_duration_minutes=slot_data.slot_duration_minutes
        )
        await db.time_slots.insert_one(slot.dict())
        slots.append(slot)
        
        current_minutes += slot_data.slot_duration_minutes
    
    return slots

@api_router.get("/events/{event_id}/doctors/{doctor_id}/slots", response_model=List[TimeSlot])
async def get_doctor_slots(event_id: str, doctor_id: str, available_only: bool = False):
    query = {"event_id": event_id, "doctor_id": doctor_id}
    if available_only:
        query["is_booked"] = False
    
    slots = await db.time_slots.find(query).sort("start_time", 1).to_list(100)
    return [TimeSlot(**slot) for slot in slots]

@api_router.delete("/slots/{slot_id}")
async def delete_slot(slot_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only doctors or admins can delete slots")
    
    slot = await db.time_slots.find_one({"id": slot_id})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    if slot["is_booked"]:
        raise HTTPException(status_code=400, detail="Cannot delete booked slot")
    
    await db.time_slots.delete_one({"id": slot_id})
    return {"message": "Slot deleted"}

# ==================== APPOINTMENTS ENDPOINTS ====================

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appt_data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can book appointments")

    async def get_doctor_display_name(doctor_id: str) -> str:
        profile = await db.doctor_profiles.find_one({"id": doctor_id})
        if not profile:
            return "Unknown doctor"
        doctor_user = await db.users.find_one({"id": profile["user_id"]})
        return f"Dr. {doctor_user['full_name']}" if doctor_user else "Unknown doctor"
    
    # Verify slot exists and is available
    slot = await db.time_slots.find_one({"id": appt_data.slot_id})
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    
    if slot["is_booked"]:
        booked_doctor_name = await get_doctor_display_name(slot["doctor_id"])
        raise HTTPException(
            status_code=400,
            detail=(
                f"This timeslot is already booked: {booked_doctor_name}, "
                f"{slot['start_time']} - {slot['end_time']}."
            )
        )

    if slot["event_id"] != appt_data.event_id or slot["doctor_id"] != appt_data.doctor_id:
        raise HTTPException(status_code=400, detail="Selected time slot does not match this doctor and event")
    
    # Check for overlapping appointments for this patient
    # Get the event date for the requested slot's event
    requested_event = await db.events.find_one({"id": slot["event_id"]})
    if not requested_event:
        raise HTTPException(status_code=404, detail="Event not found for this slot")
    
    requested_event_date = requested_event["event_date"]
    if isinstance(requested_event_date, str):
        requested_event_date = datetime.fromisoformat(requested_event_date)
    requested_date_str = requested_event_date.strftime("%Y-%m-%d")
    
    new_start = slot["start_time"]  # HH:MM format
    new_end = slot["end_time"]      # HH:MM format
    
    # Find all active (non-cancelled) appointments for this patient
    existing_appointments = await db.appointments.find({
        "patient_id": current_user["id"],
        "status": {"$nin": [AppointmentStatus.CANCELLED]}
    }).to_list(100)

    duplicate_doctor_event = next(
        (
            existing_appt for existing_appt in existing_appointments
            if existing_appt.get("doctor_id") == appt_data.doctor_id
            and existing_appt.get("event_id") == appt_data.event_id
        ),
        None
    )
    if duplicate_doctor_event:
        duplicate_slot = await db.time_slots.find_one({"id": duplicate_doctor_event.get("slot_id")})
        duplicate_doctor_name = await get_doctor_display_name(appt_data.doctor_id)
        duplicate_time = (
            f"{duplicate_slot['start_time']} - {duplicate_slot['end_time']}"
            if duplicate_slot else "an existing time"
        )
        raise HTTPException(
            status_code=400,
            detail=(
                f"You already booked {duplicate_doctor_name} for this event "
                f"({requested_event['name']}) at {duplicate_time}. "
                "Please cancel the existing appointment before booking another time with the same doctor."
            )
        )
    
    for existing_appt in existing_appointments:
        existing_slot = await db.time_slots.find_one({"id": existing_appt["slot_id"]})
        if not existing_slot:
            continue
        
        # Get the event for this existing slot to compare dates
        existing_event = await db.events.find_one({"id": existing_slot["event_id"]})
        if not existing_event:
            continue
        
        existing_event_date = existing_event["event_date"]
        if isinstance(existing_event_date, str):
            existing_event_date = datetime.fromisoformat(existing_event_date)
        existing_date_str = existing_event_date.strftime("%Y-%m-%d")
        
        # Only check overlap if events are on the same date
        if existing_date_str == requested_date_str:
            existing_start = existing_slot["start_time"]
            existing_end = existing_slot["end_time"]
            
            # Two time ranges overlap if: start1 < end2 AND start2 < end1
            if new_start < existing_end and existing_start < new_end:
                existing_doctor_name = await get_doctor_display_name(existing_appt["doctor_id"])
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Timeslot conflict: your selected time {new_start} - {new_end} "
                        f"overlaps with {existing_doctor_name} at {existing_start} - {existing_end} "
                        f"for {existing_event['name']} on {requested_date_str}."
                    )
                )
    
    # Get event details for QR
    event = await db.events.find_one({"id": appt_data.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get doctor details for QR
    doctor_profile = await db.doctor_profiles.find_one({"id": appt_data.doctor_id})
    doctor_user = await db.users.find_one({"id": doctor_profile["user_id"]}) if doctor_profile else None
    
    # Create appointment
    appointment = Appointment(
        patient_id=current_user["id"],
        doctor_id=appt_data.doctor_id,
        event_id=appt_data.event_id,
        slot_id=appt_data.slot_id,
        patient_name=appt_data.patient_name,
        patient_phone=appt_data.patient_phone,
        reason=appt_data.reason
    )
    
    # Generate QR code with appointment details
    qr_data = {
        "appointment_id": appointment.id,
        "patient_name": appointment.patient_name,
        "event": event["name"],
        "event_date": event["event_date"].isoformat(),
        "doctor": doctor_user["full_name"] if doctor_user else "Unknown",
        "time": f"{slot['start_time']} - {slot['end_time']}"
    }
    appointment.qr_code = generate_qr_code(qr_data)
    
    # Save appointment
    await db.appointments.insert_one(appointment.dict())
    
    # Mark slot as booked
    await db.time_slots.update_one({"id": appt_data.slot_id}, {"$set": {"is_booked": True}})
    
    # Create notifications
    await create_notification(
        current_user["id"],
        "Appointment Confirmed",
        f"Your appointment with Dr. {doctor_user['full_name'] if doctor_user else 'Unknown'} is confirmed for {slot['start_time']}",
        "appointment",
        appointment.id
    )
    
    if doctor_profile:
        await create_notification(
            doctor_profile["user_id"],
            "New Appointment",
            f"New appointment booked by {appointment.patient_name} at {slot['start_time']}",
            "appointment",
            appointment.id
        )
    
    return appointment

@api_router.get("/appointments", response_model=List[dict])
async def get_my_appointments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == UserRole.PATIENT:
        query = {"patient_id": current_user["id"]}
    elif current_user["role"] == UserRole.DOCTOR:
        profile = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
        if not profile:
            return []
        query = {"doctor_id": profile["id"]}
    else:
        # Admin can see all
        query = {}
    
    appointments = await db.appointments.find(query).sort("created_at", -1).to_list(100)
    
    result = []
    for appt in appointments:
        # Remove MongoDB _id field to avoid serialization issues
        appt_clean = {k: v for k, v in appt.items() if k != "_id"}
        
        # Enrich with event and doctor details
        event = await db.events.find_one({"id": appt["event_id"]})
        slot = await db.time_slots.find_one({"id": appt["slot_id"]})
        doctor_profile = await db.doctor_profiles.find_one({"id": appt["doctor_id"]})
        doctor_user = await db.users.find_one({"id": doctor_profile["user_id"]}) if doctor_profile else None
        patient_user = await db.users.find_one({"id": appt["patient_id"]})
        
        result.append({
            **appt_clean,
            "event_name": event["name"] if event else "Unknown",
            "event_date": event["event_date"].isoformat() if event else None,
            "event_location": event["location"] if event else None,
            "slot_time": f"{slot['start_time']} - {slot['end_time']}" if slot else "Unknown",
            "doctor_name": doctor_user["full_name"] if doctor_user else "Unknown",
            "doctor_specialization": doctor_profile["specialization"] if doctor_profile else "Unknown",
            "doctor_profile_image": doctor_profile.get("profile_image") if doctor_profile else None,
            "patient_profile_image": patient_user.get("profile_image") if patient_user else None
        })
    
    return result

@api_router.get("/appointments/{appointment_id}")
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verify access
    if current_user["role"] == UserRole.PATIENT and appointment["patient_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Remove MongoDB _id field to avoid serialization issues
    appointment_clean = {k: v for k, v in appointment.items() if k != "_id"}
    
    # Enrich with details
    event = await db.events.find_one({"id": appointment["event_id"]})
    slot = await db.time_slots.find_one({"id": appointment["slot_id"]})
    doctor_profile = await db.doctor_profiles.find_one({"id": appointment["doctor_id"]})
    doctor_user = await db.users.find_one({"id": doctor_profile["user_id"]}) if doctor_profile else None
    patient_user = await db.users.find_one({"id": appointment["patient_id"]})
    
    return {
        **appointment_clean,
        "event_name": event["name"] if event else "Unknown",
        "event_date": event["event_date"].isoformat() if event else None,
        "event_location": event["location"] if event else None,
        "slot_time": f"{slot['start_time']} - {slot['end_time']}" if slot else "Unknown",
        "doctor_name": doctor_user["full_name"] if doctor_user else "Unknown",
        "doctor_specialization": doctor_profile["specialization"] if doctor_profile else "Unknown",
        "doctor_profile_image": doctor_profile.get("profile_image") if doctor_profile else None,
        "patient_profile_image": patient_user.get("profile_image") if patient_user else None
    }

@api_router.put("/appointments/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verify access
    if current_user["role"] == UserRole.PATIENT and appointment["patient_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if appointment["status"] == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Appointment already cancelled")
    
    # Update appointment status
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": AppointmentStatus.CANCELLED, "updated_at": datetime.utcnow()}}
    )
    
    # Free up the slot
    await db.time_slots.update_one({"id": appointment["slot_id"]}, {"$set": {"is_booked": False}})
    
    # Notify
    await create_notification(
        appointment["patient_id"],
        "Appointment Cancelled",
        "Your appointment has been cancelled",
        "appointment",
        appointment_id
    )
    
    return {"message": "Appointment cancelled"}

@api_router.put("/appointments/{appointment_id}/complete")
async def complete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can complete appointments")
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Update status
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": AppointmentStatus.COMPLETED, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Appointment marked as completed"}

@api_router.post("/appointments/verify")
async def verify_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Verify appointment via QR code scan"""
    if current_user["role"] != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can verify appointments")
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get doctor's profile
    profile = await db.doctor_profiles.find_one({"user_id": current_user["id"]})
    if not profile or profile["id"] != appointment["doctor_id"]:
        raise HTTPException(status_code=403, detail="This appointment is not assigned to you")
    
    # Return appointment details for verification
    event = await db.events.find_one({"id": appointment["event_id"]})
    slot = await db.time_slots.find_one({"id": appointment["slot_id"]})
    patient_user = await db.users.find_one({"id": appointment["patient_id"]})
    
    return {
        "valid": True,
        "appointment_id": appointment["id"],
        "patient_name": appointment["patient_name"],
        "patient_phone": appointment.get("patient_phone"),
        "patient_profile_image": patient_user.get("profile_image") if patient_user else None,
        "reason": appointment.get("reason"),
        "event_name": event["name"] if event else "Unknown",
        "slot_time": f"{slot['start_time']} - {slot['end_time']}" if slot else "Unknown",
        "status": appointment["status"]
    }

# ==================== NOTIFICATIONS ENDPOINTS ====================

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(50)
    return [Notification(**n) for n in notifications]

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": current_user["id"], "is_read": False})
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== ADMIN ENDPOINTS ====================

class AdminUserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str = UserRole.PATIENT
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


@api_router.post("/admin/users", response_model=UserResponse)
async def admin_create_user(user_data: AdminUserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    email = user_data.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not user_data.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")
    if user_data.role not in [UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Invalid role")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name.strip(),
        "phone": user_data.phone.strip() if user_data.phone else None,
        "role": user_data.role,
        "is_active": user_data.is_active,
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user)
    return UserResponse(**user)


@api_router.put("/admin/users/{user_id}", response_model=UserResponse)
async def admin_update_user(user_id: str, user_data: AdminUserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    if "email" in update_data:
        email = update_data["email"].strip().lower()
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="A valid email is required")
        duplicate = await db.users.find_one({"email": email, "id": {"$ne": user_id}})
        if duplicate:
            raise HTTPException(status_code=400, detail="Email already registered")
        update_data["email"] = email
    if "full_name" in update_data:
        update_data["full_name"] = update_data["full_name"].strip()
        if not update_data["full_name"]:
            raise HTTPException(status_code=400, detail="Full name is required")
    if "phone" in update_data:
        update_data["phone"] = update_data["phone"].strip() or None
    if "role" in update_data and update_data["role"] not in [UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Invalid role")
    if "password" in update_data:
        if len(update_data["password"]) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        update_data["password"] = hash_password(update_data["password"])

    if user_id == current_user["id"] and update_data.get("is_active") is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated = await db.users.find_one({"id": user_id})
    return UserResponse(**updated)

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find().to_list(100)
    return [UserResponse(
        id=u["id"],
        email=u["email"],
        full_name=u["full_name"],
        phone=u.get("phone"),
        profile_image=u.get("profile_image"),
        role=u["role"],
        is_active=u.get("is_active", True)
    ) for u in users]

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if role not in [UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Role updated"}

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, is_active: bool, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": is_active}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User status updated"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Don't allow deleting yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also delete related data
    await db.doctor_profiles.delete_many({"user_id": user_id})
    await db.appointments.delete_many({"patient_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    
    return {"message": "User deleted"}

# Admin Doctor Management

# Model for admin to create a doctor
class AdminCreateDoctor(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    specialization: str
    qualification: str
    experience_years: int
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    consultation_fee: float = 0.0
    duty_slots: List[DoctorDutySlot] = Field(default_factory=list)

@api_router.post("/admin/doctors")
async def admin_create_doctor(doctor_data: AdminCreateDoctor, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if email exists
    existing = await db.users.find_one({"email": doctor_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with doctor role
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "email": doctor_data.email.lower(),
        "password": hash_password(doctor_data.password),
        "full_name": doctor_data.full_name,
        "phone": doctor_data.phone,
        "role": UserRole.DOCTOR,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user_dict)
    
    # Create doctor profile
    profile = DoctorProfile(
        user_id=user_id,
        specialization=doctor_data.specialization,
        qualification=doctor_data.qualification,
        experience_years=doctor_data.experience_years,
        bio=doctor_data.bio,
        profile_image=doctor_data.profile_image,
        consultation_fee=doctor_data.consultation_fee,
        duty_slots=doctor_data.duty_slots
    )
    await db.doctor_profiles.insert_one(profile.dict())
    
    return {"message": "Doctor created successfully", "doctor_id": profile.id, "user_id": user_id}

@api_router.get("/admin/doctors", response_model=List[DoctorProfileResponse])
async def admin_get_all_doctors(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    profiles = await db.doctor_profiles.find().to_list(100)
    result = []
    for profile in profiles:
        user = await db.users.find_one({"id": profile["user_id"]})
        if user:
            result.append(DoctorProfileResponse(
                id=profile["id"],
                user_id=profile["user_id"],
                full_name=user["full_name"],
                email=user["email"],
                specialization=profile["specialization"],
                qualification=profile["qualification"],
                experience_years=profile["experience_years"],
                bio=profile.get("bio"),
                profile_image=profile.get("profile_image"),
                consultation_fee=profile.get("consultation_fee", 0.0),
                duty_slots=profile.get("duty_slots", [])
            ))
    return result

@api_router.put("/admin/doctors/{doctor_id}")
async def admin_update_doctor(doctor_id: str, profile_data: DoctorProfileCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    profile = await db.doctor_profiles.find_one({"id": doctor_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    update_data = profile_data.dict()
    await db.doctor_profiles.update_one({"id": doctor_id}, {"$set": update_data})
    
    return {"message": "Doctor profile updated"}

@api_router.delete("/admin/doctors/{doctor_id}")
async def admin_delete_doctor(doctor_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    profile = await db.doctor_profiles.find_one({"id": doctor_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    # Delete the doctor profile
    await db.doctor_profiles.delete_one({"id": doctor_id})
    
    # Remove from events
    await db.event_doctors.delete_many({"doctor_id": doctor_id})
    
    # Delete their slots
    await db.time_slots.delete_many({"doctor_id": doctor_id})
    
    return {"message": "Doctor profile deleted"}

# Admin Appointment Management
@api_router.get("/admin/appointments")
async def admin_get_all_appointments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    appointments = await db.appointments.find().sort("created_at", -1).to_list(200)
    
    result = []
    for appt in appointments:
        # Remove MongoDB _id field
        appt_data = {k: v for k, v in appt.items() if k != '_id'}
        
        # Enrich with event and doctor details
        event = await db.events.find_one({"id": appt["event_id"]})
        slot = await db.time_slots.find_one({"id": appt["slot_id"]})
        doctor_profile = await db.doctor_profiles.find_one({"id": appt["doctor_id"]})
        doctor_user = await db.users.find_one({"id": doctor_profile["user_id"]}) if doctor_profile else None
        patient_user = await db.users.find_one({"id": appt["patient_id"]})
        
        result.append({
            **appt_data,
            "event_name": event["name"] if event else "Unknown",
            "event_date": event["event_date"].isoformat() if event else None,
            "event_location": event["location"] if event else None,
            "slot_time": f"{slot['start_time']} - {slot['end_time']}" if slot else "Unknown",
            "doctor_name": doctor_user["full_name"] if doctor_user else "Unknown",
            "doctor_specialization": doctor_profile["specialization"] if doctor_profile else "Unknown",
            "doctor_profile_image": doctor_profile.get("profile_image") if doctor_profile else None,
            "patient_profile_image": patient_user.get("profile_image") if patient_user else None,
            "patient_email": patient_user["email"] if patient_user else "Unknown"
        })
    
    return result

@api_router.put("/admin/appointments/{appointment_id}/status")
async def admin_update_appointment_status(appointment_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if status not in [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    old_status = appointment["status"]
    
    # Update appointment status
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    # If cancelling, free up the slot
    if status == AppointmentStatus.CANCELLED and old_status != AppointmentStatus.CANCELLED:
        await db.time_slots.update_one({"id": appointment["slot_id"]}, {"$set": {"is_booked": False}})
    
    # Notify patient
    await create_notification(
        appointment["patient_id"],
        "Appointment Status Updated",
        f"Your appointment status has been changed to: {status}",
        "appointment",
        appointment_id
    )
    
    return {"message": "Appointment status updated"}

@api_router.delete("/admin/appointments/{appointment_id}")
async def admin_delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Free up the slot
    await db.time_slots.update_one({"id": appointment["slot_id"]}, {"$set": {"is_booked": False}})
    
    # Delete the appointment
    await db.appointments.delete_one({"id": appointment_id})
    
    return {"message": "Appointment deleted"}

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_patients = await db.users.count_documents({"role": UserRole.PATIENT})
    total_doctors = await db.users.count_documents({"role": UserRole.DOCTOR})
    total_events = await db.events.count_documents({})
    active_events = await db.events.count_documents({"is_active": True})
    total_appointments = await db.appointments.count_documents({})
    completed_appointments = await db.appointments.count_documents({"status": AppointmentStatus.COMPLETED})
    
    return {
        "total_users": total_users,
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_events": total_events,
        "active_events": active_events,
        "total_appointments": total_appointments,
        "completed_appointments": completed_appointments
    }

# ==================== NEWS API ====================

@api_router.get("/news")
async def get_news(
    category: Optional[str] = None,
    search: Optional[str] = None,
    pinned_only: bool = False,
    limit: int = 50
):
    """Get published news from the last month, pinned items first"""
    one_month_ago = datetime.utcnow() - timedelta(days=30)
    
    query: dict = {
        "is_published": True,
        "publish_date": {"$lte": datetime.utcnow()},
    }
    
    # Only filter by date for non-pinned requests
    if not pinned_only:
        query["$or"] = [
            {"publish_date": {"$gte": one_month_ago, "$lte": datetime.utcnow()}},
            {"is_pinned": True}
        ]
        del query["publish_date"]
    
    if category:
        query["category"] = category
    
    if search:
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"title": {"$regex": search, "$options": "i"}},
                {"summary": {"$regex": search, "$options": "i"}},
                {"content": {"$regex": search, "$options": "i"}},
            ]
        })
    
    # Sort: pinned first, then by publish_date descending
    news = await db.news.find(query).sort([
        ("is_pinned", -1),
        ("is_urgent", -1),
        ("publish_date", -1)
    ]).to_list(limit)
    
    for item in news:
        item.pop("_id", None)
    
    return news

@api_router.get("/news/{news_id}")
async def get_news_item(news_id: str):
    """Get a single news item and increment view count"""
    news = await db.news.find_one({"id": news_id})
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    # Increment view count
    await db.news.update_one({"id": news_id}, {"$inc": {"view_count": 1}})
    news["view_count"] = news.get("view_count", 0) + 1
    
    news.pop("_id", None)
    return news

@api_router.post("/news")
async def create_news(news_data: NewsCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    publish_dt = datetime.utcnow()
    if news_data.publish_date:
        try:
            publish_dt = datetime.fromisoformat(news_data.publish_date.replace("Z", "+00:00"))
        except ValueError:
            publish_dt = datetime.utcnow()
    
    news = NewsPost(
        title=news_data.title,
        summary=news_data.summary,
        content=news_data.content,
        thumbnail=news_data.thumbnail,
        category=news_data.category,
        is_pinned=news_data.is_pinned,
        is_urgent=news_data.is_urgent,
        is_published=news_data.is_published,
        publish_date=publish_dt,
        created_by=current_user["id"],
        author_name=current_user.get("full_name", "Admin"),
    )
    
    await db.news.insert_one(news.dict())
    
    # If urgent, notify all users
    if news_data.is_urgent and news_data.is_published:
        users = await db.users.find({}).to_list(500)
        for u in users:
            await create_notification(
                u["id"],
                f"🚨 {news.title}",
                news.summary,
                "news",
                news.id
            )
    
    result = news.dict()
    return result

@api_router.put("/news/{news_id}")
async def update_news(news_id: str, news_data: NewsUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    news = await db.news.find_one({"id": news_id})
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    update_dict = {k: v for k, v in news_data.dict().items() if v is not None}
    
    if "publish_date" in update_dict and isinstance(update_dict["publish_date"], str):
        try:
            update_dict["publish_date"] = datetime.fromisoformat(update_dict["publish_date"].replace("Z", "+00:00"))
        except ValueError:
            del update_dict["publish_date"]
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.news.update_one({"id": news_id}, {"$set": update_dict})
    
    updated = await db.news.find_one({"id": news_id})
    updated.pop("_id", None)
    return updated

@api_router.delete("/news/{news_id}")
async def delete_news(news_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    news = await db.news.find_one({"id": news_id})
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    await db.news.delete_one({"id": news_id})
    return {"message": "News deleted successfully"}

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router in the main app
app.include_router(api_router)

def parse_cors_origins() -> List[str]:
    raw_origins = os.environ.get('CORS_ORIGINS', '*')
    origins = [origin.strip() for origin in raw_origins.split(',') if origin.strip()]
    return origins or ['*']

CORS_ORIGINS = parse_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_credentials='*' not in CORS_ORIGINS,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def seed_local_demo_users():
    """Seed documented demo accounts when explicitly enabled for local use."""
    seed_demo_users = os.environ.get('SEED_DEMO_USERS', '').lower() in {'1', 'true', 'yes'}
    await db.events.create_index(
        "client_request_id",
        unique=True,
        partialFilterExpression={"client_request_id": {"$type": "string"}},
    )
    if not (USE_IN_MEMORY_DB or seed_demo_users):
        return

    demo_users = [
        ("admin@test.com", "admin123", "Demo Administrator", UserRole.ADMIN),
        ("doctor@test.com", "doctor123", "Demo Doctor", UserRole.DOCTOR),
        ("patient@test.com", "patient123", "Demo Patient", UserRole.PATIENT),
    ]

    for email, password, full_name, role in demo_users:
        if await db.users.find_one({"email": email}):
            continue
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password": hash_password(password),
            "full_name": full_name,
            "phone": None,
            "role": role,
            "created_at": datetime.utcnow(),
            "is_active": True,
        })

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
