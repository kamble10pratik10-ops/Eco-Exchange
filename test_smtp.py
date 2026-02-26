import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

def test_email():
    sender_email = os.getenv("GMAIL_USER")
    sender_password = os.getenv("GMAIL_PASSWORD")
    recipient_email = sender_email # Send to self for testing
    
    print(f"Attempting to send from: {sender_email}")
    
    if not sender_email or not sender_password:
        print("Error: GMAIL_USER or GMAIL_PASSWORD not found in .env")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = "Exo-Exchange SMTP Test"
    message["From"] = sender_email
    message["To"] = recipient_email
    message.attach(MIMEText("Testing SMTP connection...", "plain"))

    context = ssl.create_default_context()
    try:
        print("Connecting to smtp.gmail.com:465...")
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            print("Logging in...")
            server.login(sender_email, sender_password)
            print("Sending mail...")
            server.sendmail(sender_email, recipient_email, message.as_string())
        print("✅ SUCCESS: Email sent successfully!")
    except Exception as e:
        print(f"❌ FAILED: {e}")

if __name__ == "__main__":
    test_email()
