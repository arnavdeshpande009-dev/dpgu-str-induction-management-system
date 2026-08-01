import sqlite3
import os
from datetime import datetime
import config

class PostgresRow(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._values = list(self.values())
        
    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)
        
    def get(self, key, default=None):
        if isinstance(key, int):
            return self._values[key] if 0 <= key < len(self._values) else default
        return super().get(key, default)

class PostgresCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor
        
    def execute(self, sql, params=None):
        # Replace SQLite style '?' placeholders with Postgres style '%s' placeholders
        sql = sql.replace('?', '%s')
        if params is not None:
            params_tuple = tuple(params)
            self.cursor.execute(sql, params_tuple)
        else:
            self.cursor.execute(sql)
        return self
        
    def fetchone(self):
        row = self.cursor.fetchone()
        return PostgresRow(row) if row else None
        
    def fetchall(self):
        rows = self.cursor.fetchall()
        return [PostgresRow(r) for r in rows]
        
    @property
    def description(self):
        return self.cursor.description
        
    def __getattr__(self, name):
        return getattr(self.cursor, name)

class PostgresConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn
        
    def cursor(self):
        from psycopg2.extras import RealDictCursor
        cur = self.conn.cursor(cursor_factory=RealDictCursor)
        return PostgresCursorWrapper(cur)
        
    def commit(self):
        self.conn.commit()
        
    def rollback(self):
        self.conn.rollback()
        
    def close(self):
        self.conn.close()
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
        else:
            self.conn.commit()
        self.conn.close()

class SQLiteCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor
        
    def execute(self, sql, params=None):
        # Strip FOR UPDATE locking since SQLite database locks the file automatically on write
        sql = sql.replace('FOR UPDATE', '')
        if params is not None:
            self.cursor.execute(sql, params)
        else:
            self.cursor.execute(sql)
        return self
        
    def fetchone(self):
        row = self.cursor.fetchone()
        return row if row else None
        
    def fetchall(self):
        rows = self.cursor.fetchall()
        return rows
        
    @property
    def description(self):
        return self.cursor.description

    def __getattr__(self, name):
        return getattr(self.cursor, name)

class SQLiteConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn
        
    def cursor(self):
        return SQLiteCursorWrapper(self.conn.cursor())
        
    def commit(self):
        self.conn.commit()
        
    def rollback(self):
        self.conn.rollback()
        
    def close(self):
        self.conn.close()
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
        else:
            self.conn.commit()
        self.conn.close()

def get_db_connection():
    if config.IS_POSTGRES:
        import psycopg2
        # Clean postgres DSN url format
        dsn = config.DATABASE_URL
        if dsn.startswith("postgres://"):
            dsn = dsn.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(dsn)
        return PostgresConnectionWrapper(conn)
    else:
        conn = sqlite3.connect(config.DB_PATH)
        conn.row_factory = sqlite3.Row
        return SQLiteConnectionWrapper(conn)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if config.IS_POSTGRES:
        # Create Postgres tables — commit each immediately so ALTER TABLE rollbacks can't undo them
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                department VARCHAR(255),
                checked_in BOOLEAN DEFAULT FALSE,
                check_in_time VARCHAR(100),
                email_sent BOOLEAN DEFAULT FALSE,
                email_sent_time VARCHAR(100)
            )
        """)
        conn.commit()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                department VARCHAR(255) UNIQUE,
                mock_email BOOLEAN DEFAULT FALSE,
                email_provider VARCHAR(50) DEFAULT 'smtp',
                smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
                smtp_port INTEGER DEFAULT 587,
                smtp_user VARCHAR(255) DEFAULT '',
                smtp_password VARCHAR(255) DEFAULT '',
                smtp_from VARCHAR(255) DEFAULT 'induction@dpgu.edu.in',
                smtp_from_name VARCHAR(255) DEFAULT 'DPGU STR Induction Team',
                email_subject TEXT DEFAULT 'Invitation for the First-Year Induction Program of DPGU, STR on 4th August',
                email_body TEXT DEFAULT 'Dear Students and Respected Parents,\n\nGreetings and welcome to the <strong>School of Technology and Research</strong> family!\n\nIt gives us great pleasure to invite you to the <strong>Induction Program</strong> for the newly admitted <strong>First-Year B.Tech Batch of 2026–27</strong>. This program will serve as your formal welcome into the campus, introducing you to the values, resources, and opportunities that await in the coming years. Please find the attachment for invitation card.\n\n❖ <strong>Event Details – Induction Day -1</strong>\n• <strong>Date: 4th August 2026 (Tuesday)</strong>\n• <strong>Time: 9:00 AM – 4:30 PM</strong>\n• <strong>Venue: 4th floor, DPU Auditorium, Dr. D. Y. Patil Vidyapeeth, Sant Tukaram Nagar, Pimpri, Pune-411018.</strong>\n• <strong>Link: <a href=\"https://maps.app.goo.gl/NUv12m3qhUUV4SGn6?g_st=aw\" style=\"color: #3b82f6; text-decoration: underline;\">https://maps.app.goo.gl/NUv12m3qhUUV4SGn6?g_st=aw</a></strong>\n• <strong>Who Should Attend: All first-year students with parents/guardians</strong>\n\nThis session is especially important, as students and parents will be informed about all essential details of the B.Tech program.\n\n❖ <strong>Dates: 5th August 2026 (Wednesday) to 8th August 2026 (Saturday)</strong>\n• <strong>Time: 9:00 AM – 4:30 PM</strong>\n• <strong>Venue: Dr. 4th floor, DPU Auditorium, Dr. D. Y. Patil Vidyapeeth, Sant Tukaram Nagar, Pimpri, Pune-411018 & STR Building, Pimpri</strong>\n• <strong>Who Should Attend: All first-year students.</strong>\n\n<strong>⚠️ Important Note:</strong>\n• <strong>Attendance is mandatory</strong> for all students from 4th August 2026 onwards.\n• Please <strong>keep checking your email</strong> for further updates and the <strong>QR code</strong>, which will be required for <strong>registration and entry</strong>.\n• Dress formally and arrive on time to maintain the decorum of the event.\n• All students and parents are requested to <strong>park their vehicles outside the main gate</strong>. We truly appreciate your cooperation in helping us maintain smooth traffic flow and safety around the venue. Thank you so much for your understanding.\n• Contact for any query for your Faculty Coordinator\n• Student Coordinator (For Location related Query)-\n• Atharva- 9561101889, Jatin Shukla-9689665883\n\nThanks & Regards\n\n<strong>Team STR, DPGU</strong>\n<span style=\"color: #b91c1c;\">School of Technology & Research</span>\n<span style=\"color: #b91c1c;\">Dnyan Prasad Global University, Pune</span>',
                event_date VARCHAR(255) DEFAULT 'August 4, 2026',
                event_time VARCHAR(255) DEFAULT '09:00 AM',
                event_venue VARCHAR(255) DEFAULT '4th floor, DPU Auditorium'
            )
        """)
        conn.commit()
        
        # Alter table queries for backward compatibility / department migration
        # These may fail if columns already exist — each is isolated with its own commit/rollback
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN department VARCHAR(255)")
            conn.commit()
        except Exception:
            conn.rollback()
        try:
            cursor.execute("ALTER TABLE settings ADD CONSTRAINT settings_department_key UNIQUE (department)")
            conn.commit()
        except Exception:
            conn.rollback()
        try:
            cursor.execute("ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_id_check")
            conn.commit()
        except Exception:
            conn.rollback()
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN email_provider VARCHAR(50) DEFAULT 'smtp'")
            conn.commit()
        except Exception:
            conn.rollback()
            
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                is_authorized BOOLEAN DEFAULT FALSE,
                pin VARCHAR(10) NOT NULL,
                department VARCHAR(255)
            )
        """)
        conn.commit()
        
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN department VARCHAR(255)")
            conn.commit()
        except Exception:
            conn.rollback()
        
        # Seed default settings
        cursor.execute("INSERT INTO settings (id, department, mock_email) VALUES (1, 'Global', FALSE) ON CONFLICT (id) DO NOTHING")
        conn.commit()
        
    else:
        # Create SQLite tables
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
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department TEXT UNIQUE,
                mock_email BOOLEAN DEFAULT 0,
                email_provider TEXT DEFAULT 'smtp',
                smtp_host TEXT DEFAULT 'smtp.gmail.com',
                smtp_port INTEGER DEFAULT 587,
                smtp_user TEXT DEFAULT '',
                smtp_password TEXT DEFAULT '',
                smtp_from TEXT DEFAULT 'induction@dpgu.edu.in',
                smtp_from_name TEXT DEFAULT 'DPGU STR Induction Team',
                email_subject TEXT DEFAULT 'Invitation for the First-Year Induction Program of DPGU, STR on 4th August',
                email_body TEXT DEFAULT 'Dear Students and Respected Parents,\n\nGreetings and welcome to the <strong>School of Technology and Research</strong> family!\n\nIt gives us great pleasure to invite you to the <strong>Induction Program</strong> for the newly admitted <strong>First-Year B.Tech Batch of 2026–27</strong>. This program will serve as your formal welcome into the campus, introducing you to the values, resources, and opportunities that await in the coming years. Please find the attachment for invitation card.\n\n❖ <strong>Event Details – Induction Day -1</strong>\n• <strong>Date: 4th August 2026 (Tuesday)</strong>\n• <strong>Time: 9:00 AM – 4:30 PM</strong>\n• <strong>Venue: 4th floor, DPU Auditorium, Dr. D. Y. Patil Vidyapeeth, Sant Tukaram Nagar, Pimpri, Pune-411018.</strong>\n• <strong>Link: <a href=\"https://maps.app.goo.gl/NUv12m3qhUUV4SGn6?g_st=aw\" style=\"color: #3b82f6; text-decoration: underline;\">https://maps.app.goo.gl/NUv12m3qhUUV4SGn6?g_st=aw</a></strong>\n• <strong>Who Should Attend: All first-year students with parents/guardians</strong>\n\nThis session is especially important, as students and parents will be informed about all essential details of the B.Tech program.\n\n❖ <strong>Dates: 5th August 2026 (Wednesday) to 8th August 2026 (Saturday)</strong>\n• <strong>Time: 9:00 AM – 4:30 PM</strong>\n• <strong>Venue: Dr. 4th floor, DPU Auditorium, Dr. D. Y. Patil Vidyapeeth, Sant Tukaram Nagar, Pimpri, Pune-411018 & STR Building, Pimpri</strong>\n• <strong>Who Should Attend: All first-year students.</strong>\n\n<strong>⚠️ Important Note:</strong>\n• <strong>Attendance is mandatory</strong> for all students from 4th August 2026 onwards.\n• Please <strong>keep checking your email</strong> for further updates and the <strong>QR code</strong>, which will be required for <strong>registration and entry</strong>.\n• Dress formally and arrive on time to maintain the decorum of the event.\n• All students and parents are requested to <strong>park their vehicles outside the main gate</strong>. We truly appreciate your cooperation in helping us maintain smooth traffic flow and safety around the venue. Thank you so much for your understanding.\n• Contact for any query for your Faculty Coordinator\n• Student Coordinator (For Location related Query)-\n• Atharva- 9561101889, Jatin Shukla-9689665883\n\nThanks & Regards\n\n<strong>Team STR, DPGU</strong>\n<span style=\"color: #b91c1c;\">School of Technology & Research</span>\n<span style=\"color: #b91c1c;\">Dnyan Prasad Global University, Pune</span>',
                event_date TEXT DEFAULT 'August 4, 2026',
                event_time TEXT DEFAULT '09:00 AM',
                event_venue TEXT DEFAULT '4th floor, DPU Auditorium'
            )
        """)
        
        # Alter table queries for backward compatibility (SQLite only)
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN department TEXT")
        except Exception:
            pass
        try:
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_dept ON settings(department)")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE settings ADD COLUMN email_provider TEXT DEFAULT 'smtp'")
        except Exception:
            pass
            
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                is_authorized BOOLEAN DEFAULT 0,
                pin TEXT NOT NULL,
                department TEXT
            )
        """)
        
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN department TEXT")
        except Exception:
            pass
        
        cursor.execute("INSERT OR IGNORE INTO settings (id, department, mock_email) VALUES (1, 'Global', 0)")
        
    # Seed default users if not exists
    default_users = [
        ('admin', 'System Admin', 'admin', True, '0000', None),
        # CS
        ('cs_admin', 'CS Admin', 'admin', True, '0000', 'Computer Science'),
        ('cs_emp1', 'CS Employee 1', 'employee', True, '1234', 'Computer Science'),
        ('cs_emp2', 'CS Employee 2', 'employee', True, '1234', 'Computer Science'),
        # Mechanical
        ('mech_admin', 'Mechanical Admin', 'admin', True, '0000', 'Mechanical'),
        ('mech_emp1', 'Mechanical Employee 1', 'employee', True, '1234', 'Mechanical'),
        ('mech_emp2', 'Mechanical Employee 2', 'employee', True, '1234', 'Mechanical'),
        # Cyber Security
        ('cyber_admin', 'Cyber Security Admin', 'admin', True, '0000', 'Cyber Security'),
        ('cyber_emp1', 'Cyber Security Employee 1', 'employee', True, '1234', 'Cyber Security'),
        ('cyber_emp2', 'Cyber Security Employee 2', 'employee', True, '1234', 'Cyber Security'),
        # ENTC
        ('entc_admin', 'ENTC Admin', 'admin', True, '0000', 'ENTC'),
        ('entc_emp1', 'ENTC Employee 1', 'employee', True, '1234', 'ENTC'),
        ('entc_emp2', 'ENTC Employee 2', 'employee', True, '1234', 'ENTC'),
        # AIML
        ('aiml_admin', 'AIML Admin', 'admin', True, '0000', 'AIML'),
        ('aiml_emp1', 'AIML Employee 1', 'employee', True, '1234', 'AIML'),
        ('aiml_emp2', 'AIML Employee 2', 'employee', True, '1234', 'AIML')
    ]
    
    for username, name, role, is_auth, pin, dept in default_users:
        if config.IS_POSTGRES:
            existing = cursor.execute("SELECT id FROM users WHERE username = %s", (username,)).fetchone()
        else:
            existing = cursor.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            
        if not existing:
            if config.IS_POSTGRES:
                cursor.execute("""
                    INSERT INTO users (username, name, role, is_authorized, pin, department)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (username, name, role, is_auth, pin, dept))
            else:
                cursor.execute("""
                    INSERT INTO users (username, name, role, is_authorized, pin, department)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (username, name, role, is_auth, pin, dept))
                
    # Clean up old system staff accounts if they exist
    old_usernames = ('emp1', 'emp2', 'emp3', 'emp4', 'emp5', 'emp6', 'emp7', 'emp8', 'emp9', 'emp10')
    if config.IS_POSTGRES:
        cursor.execute("DELETE FROM users WHERE username IN %s", (old_usernames,))
    else:
        cursor.execute("DELETE FROM users WHERE username IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", old_usernames)
        
    conn.commit()
    conn.close()

def get_settings(department=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = None
    if department:
        if config.IS_POSTGRES:
            row = cursor.execute("SELECT * FROM settings WHERE LOWER(department) = LOWER(%s)", (department,)).fetchone()
        else:
            row = cursor.execute("SELECT * FROM settings WHERE LOWER(department) = LOWER(?)", (department,)).fetchone()
            
    if not row:
        if config.IS_POSTGRES:
            row = cursor.execute("SELECT * FROM settings WHERE department = %s", ('Global',)).fetchone()
        else:
            row = cursor.execute("SELECT * FROM settings WHERE department = ?", ('Global',)).fetchone()
            
    if not row:
        row = cursor.execute("SELECT * FROM settings ORDER BY id ASC").fetchone()
        
    conn.close()
    return dict(row) if row else None

def update_settings(settings_dict, department=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    dept = department or 'Global'
    
    # Check if a row exists for this department
    if config.IS_POSTGRES:
        row = cursor.execute("SELECT id FROM settings WHERE LOWER(department) = LOWER(%s)", (dept,)).fetchone()
    else:
        row = cursor.execute("SELECT id FROM settings WHERE LOWER(department) = LOWER(?)", (dept,)).fetchone()
        
    if row:
        cursor.execute("""
            UPDATE settings
            SET mock_email = ?,
                email_provider = ?,
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
            WHERE id = ?
        """, (
            True if settings_dict.get("mock_email", True) else False,
            settings_dict.get("email_provider", "smtp"),
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
            settings_dict.get("event_venue", "Main Auditorium"),
            row["id"]
        ))
    else:
        max_id_row = cursor.execute("SELECT MAX(id) FROM settings").fetchone()
        new_id = 1
        if max_id_row and max_id_row[0] is not None:
            new_id = int(max_id_row[0]) + 1
            
        cursor.execute("""
            INSERT INTO settings (
                id, department, mock_email, email_provider, smtp_host, smtp_port, smtp_user, smtp_password,
                smtp_from, smtp_from_name, email_subject, email_body, event_date, event_time, event_venue
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_id,
            dept,
            True if settings_dict.get("mock_email", True) else False,
            settings_dict.get("email_provider", "smtp"),
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
    cursor.execute("DROP TABLE IF EXISTS users")
    conn.commit()
    conn.close()
    init_db()
