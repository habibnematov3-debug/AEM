#!/usr/bin/env python
"""
Test script for event creation API
This script tests the complete flow of creating an event
"""
import os
import sys
import django
import requests
import json
from datetime import datetime, timedelta, time

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import AEMUser
from accounts.auth_tokens import issue_auth_token

API_BASE_URL = 'http://127.0.0.1:8000'

def get_or_create_test_user():
    """Get or create a test user"""
    user, created = AEMUser.objects.get_or_create(
        email='testuser@example.com',
        defaults={
            'full_name': 'Test User',
            'is_active': True,
        }
    )
    return user

def issue_auth_token_for_user(user):
    """Create an auth token for the user"""
    return issue_auth_token(user)

def test_create_event():
    """Test creating an event via the API"""
    print("\n" + "="*60)
    print("Testing Event Creation API")
    print("="*60)
    
    # Step 1: Get or create test user
    print("\n1. Creating test user...")
    user = get_or_create_test_user()
    print(f"   ✓ User: {user.email} (ID: {user.id})")
    
    # Step 2: Create auth token
    print("\n2. Creating auth token...")
    token = issue_auth_token_for_user(user)
    print(f"   ✓ Token created: {token[:20]}...")
    
    # Step 3: Prepare event data
    print("\n3. Preparing event data...")
    tomorrow = datetime.now() + timedelta(days=1)
    event_date = tomorrow.date()
    start_time = time(10, 0, 0)
    
    event_data = {
        'title': 'Test Event Creation',
        'description': 'This is a test event to verify the creation flow',
        'event_date': str(event_date),
        'start_time': str(start_time),
        'end_time': None,  # Should be auto-filled by backend to 11:00:00
        'location': 'Test Location',
        'category': 'General',
        'image_url': '',
        'capacity': None,
    }
    print(f"   ✓ Event data prepared:")
    for key, value in event_data.items():
        print(f"     - {key}: {value}")
    
    # Step 4: Call the API
    print("\n4. Calling POST /api/events/ ...")
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    
    try:
        response = requests.post(
            f'{API_BASE_URL}/api/events/',
            json=event_data,
            headers=headers,
            timeout=10,
            cookies={},  # Include cookies for session
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Headers: {dict(response.headers)}")
        
        response_text = response.text[:500] if response.text else '(empty)'
        print(f"   Response Body: {response_text}")
        
        if response.status_code == 201:
            print("\n   ✓ SUCCESS! Event created.")
            data = response.json()
            event = data.get('event', {})
            print(f"   Event ID: {event.get('id')}")
            print(f"   Title: {event.get('title')}")
            print(f"   Start Time: {event.get('startTime')}")
            print(f"   End Time: {event.get('endTime')}")
            return True
        else:
            print(f"\n   ✗ FAILED! Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Error body: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError as e:
        print(f"\n   ✗ Connection Error: {e}")
        print(f"   Backend might not be running at {API_BASE_URL}")
        return False
    except Exception as e:
        print(f"\n   ✗ Error: {e}")
        return False

if __name__ == '__main__':
    success = test_create_event()
    
    print("\n" + "="*60)
    if success:
        print("✓ EVENT CREATION TEST PASSED!")
    else:
        print("✗ EVENT CREATION TEST FAILED!")
    print("="*60 + "\n")
    
    sys.exit(0 if success else 1)
