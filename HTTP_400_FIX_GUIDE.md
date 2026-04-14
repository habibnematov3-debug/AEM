# HTTP 400 Fix Guide

## Problem Analysis
All backend endpoints returning HTTP 400, including `/health/`, indicates Django is rejecting requests at the host validation level, not at the view level.

## Root Cause Identified
1. **Missing proxy support settings** for Render's load balancer
2. **Incorrect ALLOWED_HOSTS parsing** from environment variables
3. **No debug visibility** into request rejection source

## Files Modified

### 1. Backend Settings (`backend/config/settings.py`)
**Added proxy support:**
```python
# Proxy support for production
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

**Added debug middleware:**
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.RequestDebugMiddleware',  # Added
]
```

### 2. Debug Middleware (`backend/config/middleware.py`)
**Created comprehensive request debugging:**
- Logs all incoming requests with host, headers, method
- Checks ALLOWED_HOSTS validation
- Logs HTTP 400 responses with details
- Captures response content for debugging

### 3. Production Settings (`backend/config/settings_production.py`)
**Created production-safe configuration:**
- Fixed ALLOWED_HOSTS parsing
- Proper proxy support
- Secure cookie settings
- Production logging configuration

### 4. Environment Files Updated
**`backend/.env.production`:**
```bash
DJANGO_ALLOWED_HOSTS=api.eventajou.uz,eventajou.uz,www.eventajou.uz,aem-backend-i4ky.onrender.com,localhost,127.0.0.1
```

## Deployment Instructions

### Step 1: Update Render Environment Variables
Set these exact environment variables in Render:

```bash
DJANGO_SECRET_KEY=[your-production-secret-key]
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.eventajou.uz,eventajou.uz,www.eventajou.uz,aem-backend-i4ky.onrender.com,localhost,127.0.0.1
DATABASE_URL=[your-production-database-url]

AEM_CORS_ALLOWED_ORIGINS=https://eventajou.uz,https://www.eventajou.uz
AEM_CSRF_TRUSTED_ORIGINS=https://eventajou.uz,https://www.eventajou.uz
AEM_GOOGLE_CLIENT_IDS=386828522213-jgtupfbeokje7klsr65ioi72f4kml5i2.apps.googleusercontent.com

AEM_SESSION_COOKIE_SECURE=True
AEM_CSRF_COOKIE_SECURE=True
AEM_SESSION_COOKIE_SAMESITE=None
AEM_CSRF_COOKIE_SAMESITE=None
```

### Step 2: Deploy Code Changes
1. Deploy updated backend to Render
2. Debug middleware will show detailed logs
3. Monitor logs for request details

### Step 3: Test and Debug
1. Test: `https://api.eventajou.uz/health/`
2. Check Render logs for debug output
3. Look for these specific log entries:

**Successful Request:**
```
🔍 Incoming Request:
  Method: GET
  Path: /api/health/
  Host: api.eventajou.uz
  X-Forwarded-Host: api.eventajou.uz
  X-Forwarded-Proto: https
  Content-Type: None
  Remote Addr: [IP]
  Allowed Hosts: [api.eventajou.uz, eventajou.uz, ...]
  Request Host: api.eventajou.uz
  Host in Allowed: True
🔍 Response Status: 200
```

**Failed Request (HTTP 400):**
```
🔍 Incoming Request:
  Host: api.eventajou.uz
  Allowed Hosts: [api.eventajou.uz, ...]
  Host in Allowed: False
🔍 HTTP 400 Response:
  Path: /api/health/
  Host: api.eventajou.uz
```

## Expected Debug Output

### If Issue is Host Validation
- **"Host in Allowed: False"** in logs
- **ALLOWED_HOSTS** shows the list
- **Request Host** shows what Django receives

### If Issue is Proxy Headers
- **X-Forwarded-Host** missing or incorrect
- **X-Forwarded-Proto** missing or incorrect
- Proxy settings not working

### If Issue is CORS/CSRF
- **CORS errors** in browser console
- **CSRF errors** in backend logs
- Preflight requests failing

## Common Issues and Solutions

### Issue 1: Host Validation Fails
**Symptoms:**
- "Host in Allowed: False" in logs
- HTTP 400 on ALL endpoints

**Solutions:**
1. Verify `DJANGO_ALLOWED_HOSTS` environment variable
2. Check for typos in domain names
3. Ensure proxy headers are being processed

### Issue 2: Proxy Headers Missing
**Symptoms:**
- Request shows wrong host
- X-Forwarded headers missing

**Solutions:**
1. Ensure `USE_X_FORWARDED_HOST = True`
2. Ensure `SECURE_PROXY_SSL_HEADER` is set
3. Check Render's proxy configuration

### Issue 3: CORS Issues
**Symptoms:**
- Browser console CORS errors
- Preflight requests failing

**Solutions:**
1. Verify `AEM_CORS_ALLOWED_ORIGINS`
2. Check `AEM_CSRF_TRUSTED_ORIGINS`
3. Ensure domains match exactly

## Production Cleanup

After fixing the issue, remove debug middleware:

### Remove Debug Middleware
1. Edit `backend/config/settings.py`
2. Remove `'config.middleware.RequestDebugMiddleware',` from MIDDLEWARE
3. Delete `backend/config/middleware.py`
4. Redeploy

### Use Production Settings
1. Set `DJANGO_SETTINGS_MODULE=config.settings_production` in Render
2. Or use production settings file as needed

## Verification

### Health Endpoint Test
```bash
curl -I https://api.eventajou.uz/api/health/
```
**Expected:** `HTTP/2 200`

### Login Endpoint Test
```bash
curl -X POST https://api.eventajou.uz/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```
**Expected:** `HTTP/2 200` or `HTTP/2 400` with valid error

## Next Steps

1. **Deploy changes** to Render
2. **Monitor logs** for debug output
3. **Identify exact rejection point**
4. **Apply specific fix** based on findings
5. **Remove debug code** once working

The debug middleware will show exactly where and why requests are being rejected, allowing for precise fixes.
