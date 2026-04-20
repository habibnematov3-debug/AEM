import os
import sys
import django
import requests
import json
from datetime import datetime, timedelta, time

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import AEMUser
from accounts.auth_tokens import issue_auth_token

print('=' * 70)
print('EVENT CREATION API TEST REPORT')
print('=' * 70)

# TEST 1: Health Check
print('\n[TEST 1] Health Endpoint: GET http://127.0.0.1:8000/api/health/')
print('-' * 70)
response = requests.get('http://127.0.0.1:8000/api/health/')
print(f'Status Code: {response.status_code}')
print(f'Response Body: {response.text}')

# TEST 2: Event Creation
print('\n[TEST 2] Event Creation: POST http://127.0.0.1:8000/api/events/')
print('-' * 70)

# Get or create test user
user, created = AEMUser.objects.get_or_create(
    email='testuser@example.com',
    defaults={
        'full_name': 'Test User',
        'is_active': True,
    }
)
print(f'User: {user.email} (ID: {user.id})')

# Create auth token
token = issue_auth_token(user)
print(f'Auth Token: {token[:30]}...')

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

print(f'\nRequest Data:')
print(json.dumps(event_data, indent=2))

# Make request
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
}

response = requests.post(
    'http://127.0.0.1:8000/api/events/',
    json=event_data,
    headers=headers
)

print(f'\nStatus Code: {response.status_code}')
print(f'Response Content-Type: {response.headers.get(\"content-type\")}')

# Extract error info
if response.status_code >= 400:
    if 'text/html' in response.headers.get('content-type', ''):
        marker = '<pre class=\"exception_value\">'
        if marker in response.text:
            start = response.text.find(marker) + len(marker)
            end = response.text.find('</pre>', start)
            error = response.text[start:end]
            print(f'Error: {error}')
        
        marker2 = '<span class=\"fname\">'
        if marker2 in response.text:
            start = response.text.find(marker2) + len(marker2)
            end = response.text.find('</span>', start)
            location = response.text[start:end]
            print(f'Location: {location}')
    else:
        try:
            print(f'Response Body: {json.dumps(response.json(), indent=2)}')
        except:
            print(f'Response Body: {response.text[:500]}')

print('\n' + '=' * 70)
