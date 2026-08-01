from pydantic import BaseModel, EmailStr
from typing import Optional, List

class StudentBase(BaseModel):
    name: str
    email: str
    department: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    student_id: str
    name: str
    email: str
    department: Optional[str] = None
    checked_in: bool
    check_in_time: Optional[str] = None
    email_sent: bool
    email_sent_time: Optional[str] = None

class StudentCheckIn(BaseModel):
    student_id: str

class CheckInResponse(BaseModel):
    success: bool
    message: str
    student: Optional[StudentResponse] = None

class StatsResponse(BaseModel):
    total_students: int
    checked_in: int
    emails_sent: int
    check_in_rate: float

class EmailConfigRequest(BaseModel):
    mock_email: bool
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    smtp_from: str
    smtp_from_name: str
    email_subject: Optional[str] = "Your DPGU STR Induction Pass & Invitation"
    email_body: Optional[str] = ""
    event_date: Optional[str] = "August 5, 2026"
    event_time: Optional[str] = "09:00 AM"
    event_venue: Optional[str] = "Main Auditorium"

class UserLoginRequest(BaseModel):
    username: str
    pin: str

class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    role: str
    is_authorized: bool
    department: Optional[str] = None
