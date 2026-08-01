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
    getattr(img, "save")(buffered, format="PNG")
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
        
    draw.text((250, 785), student_name, font=font, fill='#1e1b4b')
    draw.text((330, 840), student_department, font=font, fill='#1e1b4b')
    
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
    
    # Sensible defaults for customization
    email_subject = "Invitation for the First-Year Induction Program of DPGU, STR on 4th August"
    email_body = (
        "Dear Students and Respected Parents,\n\n"
        "Greetings and welcome to the <strong>School of Technology and Research</strong> family!\n\n"
        "It gives us great pleasure to invite you to the <strong>Induction Program</strong> for the newly admitted <strong>First-Year B.Tech Batch of 2026–27</strong>. This program will serve as your formal welcome into the campus, introducing you to the values, resources, and opportunities that await in the coming years. Please find the attachment for invitation card.\n\n"
        "❖ <strong>Event Details – Induction Day -1</strong>\n"
        "• <strong>Date: 4th August 2026 (Tuesday)</strong>\n"
        "• <strong>Time: 9:00 AM – 4:30 PM</strong>\n"
        "• <strong>Venue: 4th floor, DPU Auditorium, Dr. D. Y. Patil Vidyapeeth, Sant Tukaram Nagar, Pimpri, Pune-411018.</strong>\n"
        "• <strong>Link: <a href=\"https://maps.app.goo.gl/NUv12m3qhUUV4SGn6?g_st=aw\" style=\"color: #3b82f6; text-decoration: underline;\">https://maps.app.goo.gl/NUv12m3qhUUV4SGn6?g_st=aw</a></strong>\n"
        "• <strong>Who Should Attend: All first-year students with parents/guardians</strong>\n\n"
        "This session is especially important, as students and parents will be informed about all essential details of the B.Tech program.\n\n"
        "❖ <strong>Dates: 5th August 2026 (Wednesday) to 8th August 2026 (Saturday)</strong>\n"
        "• <strong>Time: 9:00 AM – 4:30 PM</strong>\n"
        "• <strong>Venue: Dr. 4th floor, DPU Auditorium, Dr. D. Y. Patil Vidyapeeth, Sant Tukaram Nagar, Pimpri, Pune-411018 & STR Building, Pimpri</strong>\n"
        "• <strong>Who Should Attend: All first-year students.</strong>\n\n"
        "<strong>⚠️ Important Note:</strong>\n"
        "• <strong>Attendance is mandatory</strong> for all students from 4th August 2026 onwards.\n"
        "• Please <strong>keep checking your email</strong> for further updates and the <strong>QR code</strong>, which will be required for <strong>registration and entry</strong>.\n"
        "• Dress formally and arrive on time to maintain the decorum of the event.\n"
        "• All students and parents are requested to <strong>park their vehicles outside the main gate</strong>. We truly appreciate your cooperation in helping us maintain smooth traffic flow and safety around the venue. Thank you so much for your understanding.\n"
        "• Contact for any query for your Faculty Coordinator\n"
        "• Student Coordinator (For Location related Query)-\n"
        "• Atharva- 9561101889, Jatin Shukla-9689665883\n\n"
        "Thanks & Regards\n\n"
        "<strong>Team STR, DPGU</strong>\n"
        "<span style=\"color: #b91c1c;\">School of Technology & Research</span>\n"
        "<span style=\"color: #b91c1c;\">Dnyan Prasad Global University, Pune</span>"
    )
    event_date = "August 4, 2026"
    event_time = "09:00 AM"
    event_venue = "4th floor, DPU Auditorium"

    if smtp_settings:
        mock_mode = smtp_settings.get("mock_email", mock_mode)
        host = smtp_settings.get("smtp_host", host)
        port = int(smtp_settings.get("smtp_port", port))
        user = smtp_settings.get("smtp_user", user)
        pwd = smtp_settings.get("smtp_password", pwd)
        sender = smtp_settings.get("smtp_from", sender)
        sender_name = smtp_settings.get("smtp_from_name", sender_name)
        
        email_subject = smtp_settings.get("email_subject") or email_subject
        email_body = smtp_settings.get("email_body") or email_body
        event_date = smtp_settings.get("event_date") or event_date
        event_time = smtp_settings.get("event_time") or event_time
        event_venue = smtp_settings.get("event_venue") or event_venue
        
    mock_mode = False
        
    # Email HTML body
    formatted_body = email_body.replace("\n", "<br>")
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222222; margin: 0; padding: 0;">
{formatted_body}
</body>
</html>
"""

    try:
        # Create standard multipart message
        msg = MIMEMultipart()
        msg["Subject"] = email_subject
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
            
        # Attach any other files from uploads/attachments folder
        attachments_dir = os.path.join("uploads", "attachments")
        if not os.path.exists(attachments_dir):
            attachments_dir = os.path.join("backend", "uploads", "attachments")
            
        if os.path.exists(attachments_dir):
            for filename in os.listdir(attachments_dir):
                file_path = os.path.join(attachments_dir, filename)
                if os.path.isfile(file_path):
                    try:
                        with open(file_path, "rb") as af:
                            part = MIMEBase("application", "octet-stream")
                            part.set_payload(af.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                "Content-Disposition",
                                f"attachment; filename={filename}"
                            )
                            msg.attach(part)
                    except Exception as e:
                        print(f"Failed to attach file {filename}: {e}")
            
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
