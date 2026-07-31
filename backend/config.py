import os

# We will use simple environment retrieval to keep things dependency-light and reliable
DB_PATH = os.getenv("DB_PATH", "induction_system.db")
DATABASE_URL = f"sqlite:///./{DB_PATH}"

# CORS Configuration
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# Email Settings
MOCK_EMAIL = os.getenv("MOCK_EMAIL", "True").lower() in ("true", "1", "yes")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "induction@dpgu.edu.in")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "DPGU STR Induction Team")

# Paths for generated data
UPLOAD_DIR = "uploads"
QRCODES_DIR = "static/qrcodes"
MOCK_EMAILS_DIR = "static/sent_emails"

# Make sure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(QRCODES_DIR, exist_ok=True)
os.makedirs(MOCK_EMAILS_DIR, exist_ok=True)
