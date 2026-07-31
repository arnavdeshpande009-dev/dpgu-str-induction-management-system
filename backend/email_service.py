import os
import qrcode
import base64
from io import BytesIO
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email import encoders
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
import config

def generate_qr_base64(token: str) -> str:
    """Generate QR code image and return as base64 string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(token)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#1e1b4b", back_color="white")  # Deep indigo color for QR
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def generate_qr_file(token: str, filename: str) -> str:
    """Generate QR code and save it to the static directory, returning its path"""
    path = os.path.join(config.QRCODES_DIR, f"{filename}.png")
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1e1b4b", back_color="white")
    img.save(path)
    return path

def send_email(
    student_name: str,
    student_email: str,
    student_id: str,
    student_department: str = "Computer Science",
    smtp_settings: dict = None
) -> bool:
    """Send student invitation. Saves custom PNG pass card locally and attaches it to the email."""
    # Create static directories if they don't exist
    os.makedirs(config.QRCODES_DIR, exist_ok=True)
    os.makedirs(config.MOCK_EMAILS_DIR, exist_ok=True)
    
    # Generate the customized PNG card pass
    # 1. Load card template
    template_path = os.path.join("static", "card_template.png")
    if not os.path.exists(template_path):
        template_path = os.path.join("backend", "static", "card_template.png")
        
    try:
        card = Image.open(template_path).convert('RGB')
    except Exception as e:
        print(f"Error opening card template: {e}")
        # Create a fallback peach image if template is missing
        card = Image.new('RGB', (665, 882), color='#f2dcbe')
        
    cw, ch = card.size
    
    # Generate QR Code image
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(student_id)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color='#1e1b4b', back_color='white').convert('RGB')
    qr_img = qr_img.resize((260, 260))
    
    # Paste QR in center (on full template coordinates)
    # Peach card center is X = 403. QR width = 260. Paste X = 273.
    # Peach card middle Y is from Y = 317 to Y = 787. Paste Y = 317 + (470-260)//2 = 422.
    card.paste(qr_img, (273, 422))
    
    # Draw Name and Department
    draw = ImageDraw.Draw(card)
    try:
        font = ImageFont.truetype('C:\\Windows\\Fonts\\arialbd.ttf', 24)
    except Exception:
        font = ImageFont.load_default()
        
    draw.text((231, 801), student_name, font=font, fill='#1e1b4b')
    draw.text((331, 853), student_department, font=font, fill='#1e1b4b')
    
    # Centered student ID text below the QR code (ends at Y=682, Name starts at Y=801)
    id_text = f"ID: {student_id}"
    try:
        try:
            text_w = draw.textlength(id_text, font=font)
        except AttributeError:
            bbox = draw.textbbox((0, 0), id_text, font=font)
            text_w = bbox[2] - bbox[0]
    except Exception:
        text_w = len(id_text) * 12
    text_x = 403 - text_w // 2
    draw.text((text_x, 705), id_text, font=font, fill='#1e1b4b')
    
    # Save a copy as the official QR Code file
    qr_file_path = os.path.join(config.QRCODES_DIR, f"{student_id}.png")
    card.save(qr_file_path)
    
    # Save a copy as the preview image for the dashboard (with PNG extension)
    preview_filename = f"{student_email}_{student_id}.png"
    preview_path = os.path.join(config.MOCK_EMAILS_DIR, preview_filename)
    card.save(preview_path)
    
    # Check if we should use local settings or override from dynamic UI settings
    mock_mode = config.MOCK_EMAIL
    host = config.SMTP_HOST
    port = config.SMTP_PORT
    user = config.SMTP_USER
    pwd = config.SMTP_PASSWORD
    sender = config.SMTP_FROM
    sender_name = config.SMTP_FROM_NAME
    
    if smtp_settings:
        mock_mode = smtp_settings.get("mock_email", mock_mode)
        host = smtp_settings.get("smtp_host", host)
        port = int(smtp_settings.get("smtp_port", port))
        user = smtp_settings.get("smtp_user", user)
        pwd = smtp_settings.get("smtp_password", pwd)
        sender = smtp_settings.get("smtp_from", sender)
        sender_name = smtp_settings.get("smtp_from_name", sender_name)
        
    if not mock_mode and (not user or not pwd):
        mock_mode = True
        
    if mock_mode:
        # Mock mode: we already saved the preview PNG to MOCK_EMAILS_DIR, so we are done
        return True
        
    # Email HTML body (text only, card attached as file)
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f5f7; padding: 20px; color: #1e1b4b; margin: 0;">
    <div style="max-width: 600px; background-color: #ffffff; margin: 20px auto; border-radius: 12px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
        <h2 style="color: #1e1b4b; margin-top: 0;">Welcome, {student_name}!</h2>
        <p style="line-height: 1.6; color: #4b5563; font-size: 15px;">
            Congratulations on your admission to DPGU STR! We are thrilled to welcome you to our community.
        </p>
        <p style="line-height: 1.6; color: #4b5563; font-size: 15px;">
            Attached to this email, you will find your unique <strong>Induction Check-In QR Pass</strong> (PNG image). Please download and save this pass on your mobile device. You will need to present this QR code at the registration desk for check-in on the day of the event.
        </p>
        <div style="margin: 30px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #4f46e5; border-radius: 4px; font-size: 14px; color: #374151; line-height: 1.5;">
            <strong>Event Details:</strong><br>
            📅 Date: August 5, 2026<br>
            ⏰ Reporting Time: 09:00 AM<br>
            📍 Venue: Main Auditorium<br>
            👔 Dress Code: Smart Casuals
        </div>
        <p style="font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 25px;">
            This is an automated email. Please do not reply directly to this message.
        </p>
    </div>
</body>
</html>
"""

    try:
        # Create standard multipart message
        msg = MIMEMultipart()
        msg["Subject"] = f"Your Induction Check-In QR Pass - {student_name}"
        msg["From"] = f"{sender_name} <{sender}>"
        msg["To"] = student_email
        
        # Attach HTML body text
        msg.attach(MIMEText(html_content, "html"))
        
        # Attach the generated PNG pass card as a downloadable file
        with open(preview_path, "rb") as f:
            part_attachment = MIMEBase("application", "octet-stream")
            part_attachment.set_payload(f.read())
            encoders.encode_base64(part_attachment)
            safe_filename = f"{student_name.replace(' ', '_')}_Induction_Pass.png"
            part_attachment.add_header(
                "Content-Disposition",
                f"attachment; filename={safe_filename}"
            )
            msg.attach(part_attachment)
            
        # Connect and send
        server = smtplib.SMTP(host, port)
        server.starttls()
        server.login(user, pwd)
        server.sendmail(sender, student_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"SMTP Error for {student_email}: {e}")
        # On SMTP fail, save a FAILED marker file
        failed_filename = f"FAILED_SMTP_{student_email}_{student_id}.png"
        failed_path = os.path.join(config.MOCK_EMAILS_DIR, failed_filename)
        card.save(failed_path)
        return False
