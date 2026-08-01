import os
import database, email_service, models

def run_tests():
    print("=== STARTING BACKEND TESTS ===")
    
    # 1. Test database initialization
    print("Testing DB initialization...")
    database.init_db()
    print("Database initialized successfully.")
    
    # 2. Clear DB and verify
    print("Testing database clearing...")
    database.clear_db()
    
    # 3. Insert a mock student directly
    print("Testing database insert...")
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    student_id = "DPGU-IND-1001-TEST"
    ph = "%s" if database.config.IS_POSTGRES else "?"
    
    cursor.execute(
        f"""
        INSERT INTO students (student_id, name, email, department)
        VALUES ({ph}, {ph}, {ph}, {ph})
        """,
        (student_id, "Test Student", "test@dpgu.edu.in", "Computer Science")
    )
    conn.commit()
    
    # Verify insertion
    cursor.execute(f"SELECT * FROM students WHERE student_id = {ph}", (student_id,))
    row = cursor.fetchone()
    assert row is not None, "Failed to insert test student"
    assert row["name"] == "Test Student", "Name mismatch"
    assert row["email"] == "test@dpgu.edu.in", "Email mismatch"
    assert bool(row["checked_in"]) is False, "Default check-in status should be False"
    print("Direct insert test passed.")
    
    # 4. Test QR Code and Mock Email Generation
    print("Testing QR and Email generation...")
    success = email_service.send_email(
        student_name="Test Student",
        student_email="test@dpgu.edu.in",
        student_id=student_id
    )
    assert success is True, "Failed to generate mock email"
    
    # Verify that QR Code and Mock Email files exist
    qr_path = os.path.join("static/qrcodes", f"{student_id}.png")
    email_path = os.path.join("static/sent_emails", f"test@dpgu.edu.in_{student_id}.png")
    
    assert os.path.exists(qr_path), f"QR code file not found at {qr_path}"
    assert os.path.exists(email_path), f"Mock email file not found at {email_path}"
    print(f"Generated QR Code: {qr_path}")
    print(f"Generated Mock Email: {email_path}")
    print("QR and Email generation test passed.")
    
    # 5. Verify Check-in logic
    print("Testing check-in logic...")
    cursor.execute(
        f"""
        UPDATE students
        SET checked_in = TRUE, check_in_time = '2026-07-29T12:00:00'
        WHERE student_id = {ph}
        """,
        (student_id,)
    )
    conn.commit()
    
    cursor.execute(f"SELECT * FROM students WHERE student_id = {ph}", (student_id,))
    row = cursor.fetchone()
    assert bool(row["checked_in"]) is True, "Failed to mark check-in"
    assert row["check_in_time"] == '2026-07-29T12:00:00', "Failed to record check-in time"
    print("Check-in test passed.")
    
    conn.close()
    
    # Cleanup files
    if os.path.exists(qr_path):
        os.remove(qr_path)
    if os.path.exists(email_path):
        os.remove(email_path)
        
    print("=== ALL BACKEND TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
