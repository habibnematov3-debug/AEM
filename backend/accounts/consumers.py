import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Notification

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope["user"]
        
        # Only allow authenticated users
        if self.user.is_anonymous:
            await self.close()
            return
        
        self.user_group_name = f"user_{self.user.id}"
        
        # Join personal notification group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
    
    async def notification_message(self, event):
        """Send notification to WebSocket"""
        notification_data = event['notification']
        
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': notification_data
        }))
    
    async def unread_count_update(self, event):
        """Send unread count update to WebSocket"""
        count = event['count']
        
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': count
        }))
    
    @database_sync_to_async
    def get_unread_notifications_count(self):
        """Get unread notifications count for user"""
        return Notification.objects.filter(
            user=self.user,
            read_at__isnull=True
        ).count()
