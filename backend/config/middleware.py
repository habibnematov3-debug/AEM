import logging
from django.http import HttpResponseBadRequest
from django.conf import settings

logger = logging.getLogger(__name__)

class RequestDebugMiddleware:
    """Middleware to debug HTTP 400 responses and request details."""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log incoming request details
        logger.info(f"🔍 Incoming Request:")
        logger.info(f"  Method: {request.method}")
        logger.info(f"  Path: {request.path}")
        logger.info(f"  Host: {request.get_host()}")
        logger.info(f"  X-Forwarded-Host: {request.META.get('HTTP_X_FORWARDED_HOST')}")
        logger.info(f"  X-Forwarded-Proto: {request.META.get('HTTP_X_FORWARDED_PROTO')}")
        logger.info(f"  Content-Type: {request.content_type}")
        logger.info(f"  User-Agent: {request.META.get('HTTP_USER_AGENT')}")
        logger.info(f"  Remote Addr: {request.META.get('REMOTE_ADDR')}")
        
        # Check if host is allowed
        allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
        request_host = request.get_host()
        logger.info(f"  Allowed Hosts: {allowed_hosts}")
        logger.info(f"  Request Host: {request_host}")
        logger.info(f"  Host in Allowed: {request_host in allowed_hosts}")
        
        response = self.get_response(request)
        
        # Log response details
        logger.info(f"🔍 Response Status: {response.status_code}")
        
        if response.status_code == 400:
            logger.error(f"🔍 HTTP 400 Response:")
            logger.error(f"  Path: {request.path}")
            logger.error(f"  Host: {request.get_host()}")
            logger.error(f"  Content-Type: {request.content_type}")
            
            # Try to get response content for debugging
            if hasattr(response, 'content'):
                try:
                    content = response.content.decode('utf-8')[:500]  # First 500 chars
                    logger.error(f"  Response Content: {content}")
                except:
                    logger.error(f"  Response Content: [Could not decode]")
        
        return response
