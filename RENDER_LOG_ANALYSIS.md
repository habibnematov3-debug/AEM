# Render Log Analysis Guide

## What to Look For in Render Logs

### 1. Request Entry Logs
Search for these log entries when you make a request to `https://api.eventajou.uz/health/`:

```
🔍 Incoming Request:
  Method: GET
  Path: /api/health/
  Host: api.eventajou.uz
  X-Forwarded-Host: api.eventajou.uz
  X-Forwarded-Proto: https
  Content-Type: None
  User-Agent: [browser-user-agent]
  Remote Addr: [internal-ip]
  Allowed Hosts: [list-of-hosts]
  Request Host: api.eventajou.uz
  Host in Allowed: True/False
🔍 Response Status: 400/200
```

### 2. Common HTTP 400 Sources

#### A. Host Validation Failure
**Log Pattern:**
```
Host in Allowed: False
🔍 HTTP 400 Response:
  Path: /api/health/
  Host: api.eventajou.uz
```

**Cause:** `api.eventajou.uz` not in ALLOWED_HOSTS

#### B. CSRF Failure
**Log Pattern:**
```
CSRF verification failed. Request aborted.
Forbidden (CSRF token missing or incorrect.): /api/health/
```

**Cause:** CSRF token required for POST requests

#### C. CommonMiddleware Bad Request
**Log Pattern:**
```
Bad Request: /api/health/
```

**Cause:** Invalid request format or missing headers

#### D. SecurityMiddleware Rejection
**Log Pattern:**
```
SuspiciousOperation: Invalid HTTP_HOST header
```

**Cause:** Host header validation failure

## Most Likely Issues and Fixes

### Issue 1: Host Header Mismatch
**Symptoms:**
- `Host in Allowed: False`
- ALLOWED_HOSTS shows wrong domains

**Fix:**
```python
# In settings.py, ensure this loads correctly
ALLOWED_HOSTS = get_list_env('DJANGO_ALLOWED_HOSTS', ['api.eventajou.uz'])
```

**Environment Variable Fix:**
```bash
DJANGO_ALLOWED_HOSTS=api.eventajou.uz,eventajou.uz,www.eventajou.uz
```

### Issue 2: Proxy Headers Not Processed
**Symptoms:**
- `X-Forwarded-Host: None`
- `X-Forwarded-Proto: None`
- Host shows internal Render hostname

**Fix:**
```python
# Ensure these are in settings.py
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

### Issue 3: CORS Preflight Failure
**Symptoms:**
- OPTIONS request gets 400
- CORS errors in browser

**Fix:**
```python
# Add to settings.py
CORS_ALLOW_ALL_ORIGINS = False  # Should be False
CORS_ALLOW_CREDENTIALS = True
```

## Debugging Steps

### Step 1: Make Test Request
```bash
curl -v https://api.eventajou.uz/api/health/
```

### Step 2: Check Render Logs
1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Look for 🔍 debug entries

### Step 3: Analyze Log Output
**Copy and paste the exact log output here**, including:
- All 🔍 entries
- Any ERROR or WARNING entries
- Request and response details

## Quick Fixes to Try

### Fix 1: Simplify ALLOWED_HOSTS
**Environment Variable:**
```bash
DJANGO_ALLOWED_HOSTS=api.eventajou.uz
```

**Test if single host works first.**

### Fix 2: Disable Debug Middleware Temporarily
**If middleware is causing issues:**
```python
# Comment out in settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 'config.middleware.RequestDebugMiddleware',  # Comment out
]
```

### Fix 3: Force HTTP for Testing
**Environment Variable:**
```bash
DJANGO_DEBUG=True  # Enable debug mode temporarily
```

## What to Report Back

Please provide the exact log output for:
1. **The 🔍 Incoming Request section**
2. **Any error messages above/below it**
3. **The 🔍 Response Status line**
4. **Any Django error traces**

This will allow me to identify the exact rejection point and provide a minimal fix.
