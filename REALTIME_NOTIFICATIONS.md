# Real-time Notifications Implementation

## Overview
This document explains the real-time notification system implemented for EMW using Django Channels and WebSockets.

## Architecture
```
User Action → Django View → WebSocket Channel → Frontend Client → UI Update
```

## Components

### Backend Changes
1. **Django Channels Setup**
   - Added `channels`, `channels-redis`, `daphne` to requirements.txt
   - Updated `settings.py` with ASGI application and channel layers
   - Created `asgi.py` for WebSocket routing

2. **WebSocket Consumer** (`accounts/consumers.py`)
   - Handles WebSocket connections for authenticated users
   - Joins personal notification channels (`user_{user_id}`)
   - Receives real-time notifications and unread count updates

3. **Real-time Triggers** (`accounts/notifications.py`)
   - Modified `create_in_app_notification()` to send WebSocket messages
   - Added `send_real_time_notification()` function
   - Updates notification counts in real-time

4. **API Updates** (`accounts/views.py`)
   - Updated notification read endpoints to send real-time count updates
   - Added `send_unread_count_update()` helper function

### Frontend Changes
1. **WebSocket Hook** (`src/hooks/useWebSocket.js`)
   - Manages WebSocket connection lifecycle
   - Handles reconnection logic
   - Shows toast notifications for new messages
   - Updates unread count in real-time

2. **Header Component** (`src/components/Header.jsx`)
   - Integrated WebSocket hook
   - Combines existing notifications with real-time ones
   - Updates notification badge count instantly

## How It Works

### 1. Connection Establishment
```javascript
// Frontend connects when user logs in
const ws = new WebSocket(`ws://localhost:8000/ws/notifications/?token=${token}`)
```

### 2. Notification Creation
```python
# When a notification is created
def create_in_app_notification(...):
    notification = Notification.objects.create(...)
    send_real_time_notification(notification)  # 🚀 Real-time!
```

### 3. Real-time Delivery
```python
# Send to user's personal channel
async_to_sync(channel_layer.group_send)(
    f"user_{user.id}",
    {
        'type': 'notification_message',
        'notification': notification_data
    }
)
```

### 4. Frontend Reception
```javascript
ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'notification') {
        showToastNotification(data.data)  // 🎉 Instant toast!
        updateUnreadCount()
    }
}
```

## Testing

### Method 1: Management Command
```bash
cd backend
python manage.py test_realtime_notification
```

### Method 2: Manual Testing
1. Start development servers: `./start-dev.sh` (or `start-dev.bat` on Windows)
2. Open http://localhost:5173 in browser
3. Log in as any user
4. Create an event or join an event
5. Watch for instant notifications!

### Method 3: Browser Console
```javascript
// Test WebSocket connection manually
const ws = new WebSocket('ws://localhost:8000/ws/notifications/?token=YOUR_TOKEN')
ws.onmessage = (e) => console.log(JSON.parse(e.data))
```

## Notification Types

All existing notification types now work in real-time:
- ✅ Event approved/rejected
- ✅ Participation joined/waitlisted/cancelled
- ✅ Waitlist promotion
- ✅ Event reminders
- ✅ Custom notifications

## Development

### Starting the Development Server
```bash
# Linux/Mac
./start-dev.sh

# Windows
start-dev.bat
```

### Manual Backend Start
```bash
cd backend
pip install -r requirements.txt
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Frontend Start
```bash
npm run dev
```

## Production Considerations

### Redis Configuration
For production, update `settings.py`:
```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('redis-server', 6379)],
        },
    },
}
```

### Deployment
- Use Daphne instead of Gunicorn for WebSocket support
- Configure Redis for channel layers
- Update load balancers for WebSocket support

## Troubleshooting

### WebSocket Not Connecting
1. Check backend is running with Daphne (not `manage.py runserver`)
2. Verify authentication token is valid
3. Check browser console for errors

### Notifications Not Appearing
1. Verify user has `notifications_enabled=True` in settings
2. Check backend logs for WebSocket errors
3. Test with management command

### Performance Issues
1. Use Redis in production (not InMemoryChannelLayer)
2. Monitor WebSocket connection counts
3. Implement connection cleanup for inactive users

## Future Enhancements

1. **Push Notifications**: Mobile app support
2. **Notification Preferences**: User-specific notification types
3. **Analytics**: Track notification engagement
4. **Batching**: Group similar notifications
5. **Expiry**: Auto-expire old notifications
