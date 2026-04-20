import os
import sys
import django
import requests
from datetime import datetime, timedelta, time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import AEMUser
from accounts.auth_tokens import issue_auth_token

# Create or get test user
user, created = AEMUser.objects.get_or_create(
    email='testuser@example.com',
    defaults={
        'full_name': 'Test User',
        'is_active': True,
    }
)

# Issue auth token
token = issue_auth_token(user)

# Prepare event data
tomorrow = datetime.now() + timedelta(days=1)
event_date = tomorrow.date()
start_time = time(10, 0, 0)

event_data = {
    'title': 'Tech Conference 2024',
    'description': 'A major conference for technology professionals',
    'event_date': str(event_date),
    'start_time': str(start_time),
    'location': 'Convention Center, Downtown',
    'category': 'Technology'
}

# Make API request
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
}

response = requests.post(
    'http://127.0.0.1:8000/api/events/',
    json=event_data,
    headers=headers
)

print('Status Code:', response.status_code)

# Look for exception_value pattern
exception_marker = '<p class="exception_value">'
if exception_marker in response.text:
    start = response.text.find(exception_marker) + len(exception_marker)
    end = response.text.find('</p>', start)
    error_msg = response.text[start:end]
    print('Error Message:', error_msg[:1000])

# Look for the traceback section  
if 'Traceback' in response.text:
    start = response.text.find('Traceback')
    print('Traceback section:')
    print(response.text[start:start+1000])
