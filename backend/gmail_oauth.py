import os
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Scopes required to send emails via Gmail API
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_gmail_service():
    """
    Resolves Google OAuth2 credentials and returns an authorized Gmail API service instance.
    If token.json is missing or expired, it initiates the browser authentication flow.
    """
    creds = None
    
    # Path settings
    token_path = 'token.json'
    if not os.path.exists(token_path):
        token_path = os.path.join('backend', 'token.json')
        
    if os.path.exists(token_path):
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except Exception as e:
            print(f"[OAuth] Error loading token file: {e}")
            creds = None
            
    # If no valid credentials are loaded, prompt authorization flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"[OAuth] Refresh failed: {e}")
                creds = None
                
        if not creds:
            # Locate client secret credentials file
            client_secret_file = None
            
            # Look in root directory
            for f in os.listdir('.'):
                if f.startswith('client_secret_') and f.endswith('.json'):
                    client_secret_file = f
                    break
                    
            # Look in backend directory
            if not client_secret_file and os.path.exists('backend'):
                for f in os.listdir('backend'):
                    if f.startswith('client_secret_') and f.endswith('.json'):
                        client_secret_file = os.path.join('backend', f)
                        break
                        
            # Fallback checks for generic 'credentials.json'
            if not client_secret_file:
                if os.path.exists('credentials.json'):
                    client_secret_file = 'credentials.json'
                elif os.path.exists(os.path.join('backend', 'credentials.json')):
                    client_secret_file = os.path.join('backend', 'credentials.json')
                    
            if not client_secret_file:
                raise FileNotFoundError("OAuth Client Secret JSON file (client_secret_*.json) was not found in the backend workspace.")
                
            print(f"[OAuth] Loading client secrets from: {client_secret_file}")
            flow = InstalledAppFlow.from_client_secrets_file(client_secret_file, SCOPES)
            # Run local server to authenticate (opens browser window)
            creds = flow.run_local_server(port=0)
            
        # Save credentials back to token.json
        save_path = 'token.json'
        if os.path.exists('backend'):
            save_path = os.path.join('backend', 'token.json')
            
        with open(save_path, 'w') as token_file:
            token_file.write(creds.to_json())
            print(f"[OAuth] Token saved successfully to: {save_path}")
            
    return build('gmail', 'v1', credentials=creds)
