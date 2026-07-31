import sqlite3
import os
from datetime import datetime
from config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Students Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            department TEXT,
            checked_in BOOLEAN DEFAULT 0,
            check_in_time TEXT,
            email_sent BOOLEAN DEFAULT 0,
            email_sent_time TEXT
        )
    """)
    
    # Settings Table (Single Row)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            mock_email BOOLEAN DEFAULT 1,
            smtp_host TEXT DEFAULT 'smtp.gmail.com',
            smtp_port INTEGER DEFAULT 587,
            smtp_user TEXT DEFAULT '',
            smtp_password TEXT DEFAULT '',
            smtp_from TEXT DEFAULT 'induction@dpgu.edu.in',
            smtp_from_name TEXT DEFAULT 'DPGU STR Induction Team',
            email_subject TEXT DEFAULT 'Invitation for the First-Year Induction Program of DPGU, STR on 4th August',
            email_body TEXT DEFAULT 'Dear Students and Respected Parents,\n\nGreetings and welcome to the <strong>School of Technology and Research</strong> family!\n\nIt gives us great pleasure to invite you to the <strong>Induction Program</strong> for the newly admitted <strong>First-Year B.Tech Batch of 2026–27</strong>. This program will serve as your formal welcome into the campus, introducing you to the values, resources, and opportunities that await in the coming years. Please find the attachment for invitation card.\n\n❖ <strong>Event Details – Induction Day -1</strong>\n• <strong>Date: 4th August 2026 (Tuesday)</strong>\n• <strong>Time: 9:00 AM – 4:30 PM</strong>\n• <strong>Venue: 4th floor, DPU Auditorium, Dr. D. Y. Patil Vidyapeeth, Sant Tukaram Nagar, Pimpri, Pune-411018.</strong>\n• <strong>Link: <a href="https://maps.app.goo.gl/NUv12m3qhUUV4SGn6?g_st=aw" style="color: #3b82f6; text-decoration: underline;">https://maps.app.goo.gl/NUv12m3qhUUV4SGn6?g_st=aw</a></strong>\n• <strong>Who Should Attend: All first-year students with parents/guardians</strong>\n\nThis session is especially important, as students and parents will be informed about all essential details of the B.Tech program.\n\n❖ <strong>Dates: 5th August 2026 (Wednesday) to 8th August 2026 (Saturday)</strong>\n• <strong>Time: 9:00 AM – 4:30 PM</strong>\n• <strong>Venue: Dr. 4th floor, DPU Auditorium, Dr. D. Y. Patil Vidyapeeth, Sant Tukaram Nagar, Pimpri, Pune-411018 & STR Building, Pimpri</strong>\n• <strong>Who Should Attend: All first-year students.</strong>\n\n<strong>⚠️ Important Note:</strong>\n• <strong>Attendance is mandatory</strong> for all students from 4th August 2026 onwards.\n• Please <strong>keep checking your email</strong> for further updates and the <strong>QR code</strong>, which will be required for <strong>registration and entry</strong>.\n• Dress formally and arrive on time to maintain the decorum of the event.\n• All students and parents are requested to <strong>park their vehicles outside the main gate</strong>. We truly appreciate your cooperation in helping us maintain smooth traffic flow and safety around the venue. Thank you so much for your understanding.\n• Contact for any query for your Faculty Coordinator\n• Student Coordinator (For Location related Query)-\n• Atharva- 9561101889, Jatin Shukla-9689665883\n\nThanks & Regards\n\n<strong>Team STR, DPGU</strong>\n<span style="color: #b91c1c;">School of Technology & Research</span>\n<span style="color: #b91c1c;">Dnyan Prasad Global University, Pune</span>',
            event_date TEXT DEFAULT 'August 4, 2026',
            event_time TEXT DEFAULT '09:00 AM',
            event_venue TEXT DEFAULT '4th floor, DPU Auditorium'
        )
    """)
    
    # Try altering table to add columns for existing databases (backwards compatibility)
    try:
        cursor.execute("ALTER TABLE settings ADD COLUMN email_subject TEXT DEFAULT 'Your DPGU STR Induction Pass & Invitation'")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE settings ADD COLUMN email_body TEXT DEFAULT 'Congratulations on your admission to DPGU STR! We are thrilled to welcome you to our community.\n\nAttached to this email, you will find your unique Induction Check-In QR Pass (PNG image). Please download and save this pass on your mobile device. You will need to present this QR code at the registration desk for check-in on the day of the event.'")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE settings ADD COLUMN event_date TEXT DEFAULT 'August 5, 2026'")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE settings ADD COLUMN event_time TEXT DEFAULT '09:00 AM'")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE settings ADD COLUMN event_venue TEXT DEFAULT 'Main Auditorium'")
    except Exception:
        pass
    
    # Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            is_authorized BOOLEAN DEFAULT 0,
            pin TEXT NOT NULL
        )
    """)
    
    # Seed default settings if not exists
    cursor.execute("INSERT OR IGNORE INTO settings (id, mock_email) VALUES (1, 1)")
    
    # Seed default users if not exists
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (username, name, role, is_authorized, pin) VALUES ('admin', 'Induction Admin', 'admin', 1, '0000')")
        for i in range(1, 11):
            cursor.execute("INSERT INTO users (username, name, role, is_authorized, pin) VALUES (?, ?, 'employee', 1, '1234')", (f"emp{i}", f"Employee {i}"))
    
    conn.commit()
    conn.close()

def get_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM settings WHERE id = 1").fetchone()
    conn.close()
    return dict(row) if row else None

def update_settings(settings_dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE settings
        SET mock_email = ?,
            smtp_host = ?,
            smtp_port = ?,
            smtp_user = ?,
            smtp_password = ?,
            smtp_from = ?,
            smtp_from_name = ?,
            email_subject = ?,
            email_body = ?,
            event_date = ?,
            event_time = ?,
            event_venue = ?
        WHERE id = 1
    """, (
        1 if settings_dict.get("mock_email", True) else 0,
        settings_dict.get("smtp_host", "smtp.gmail.com"),
        int(settings_dict.get("smtp_port", 587)),
        settings_dict.get("smtp_user", ""),
        settings_dict.get("smtp_password", ""),
        settings_dict.get("smtp_from", "induction@dpgu.edu.in"),
        settings_dict.get("smtp_from_name", "DPGU STR Induction Team"),
        settings_dict.get("email_subject", "Your DPGU STR Induction Pass & Invitation"),
        settings_dict.get("email_body", ""),
        settings_dict.get("event_date", "August 5, 2026"),
        settings_dict.get("event_time", "09:00 AM"),
        settings_dict.get("event_venue", "Main Auditorium")
    ))
    conn.commit()
    conn.close()

def clear_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS students")
    cursor.execute("DROP TABLE IF EXISTS settings")
    conn.commit()
    conn.close()
    init_db()
