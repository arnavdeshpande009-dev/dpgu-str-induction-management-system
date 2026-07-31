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
            smtp_from_name TEXT DEFAULT 'DPGU STR Induction Team'
        )
    """)
    
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
            smtp_from_name = ?
        WHERE id = 1
    """, (
        1 if settings_dict.get("mock_email", True) else 0,
        settings_dict.get("smtp_host", "smtp.gmail.com"),
        int(settings_dict.get("smtp_port", 587)),
        settings_dict.get("smtp_user", ""),
        settings_dict.get("smtp_password", ""),
        settings_dict.get("smtp_from", "induction@dpgu.edu.in"),
        settings_dict.get("smtp_from_name", "DPGU STR Induction Team")
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
