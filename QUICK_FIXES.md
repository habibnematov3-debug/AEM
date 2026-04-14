# Quick Fixes for HTTP 400

## Most Likely Issue: Host Validation

### Fix 1: Simplify ALLOWED_HOSTS
**Set in Render environment:**
```bash
DJANGO_ALLOWED_HOSTS=api.eventajou.uz
```

**Test first with just the API domain.**

### Fix 2: Check Proxy Headers
**If proxy headers missing, add to settings:**
```python
# In backend/config/settings.py
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
```

### Fix 3: Disable Debug Middleware
**If middleware causing issues:**
1. Go to Render dashboard
2. Edit `backend/config/settings.py`
3. Comment out debug middleware:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 'config.middleware.RequestDebugMiddleware',  # Temporarily disable
]
```

### Fix 4: Check Environment Variable Loading
**Add debug print to settings:**
```python
# In backend/config/settings.py, after ALLOWED_HOSTS
print(f"🔍 ALLOWED_HOSTS loaded: {ALLOWED_HOSTS}")
print(f"🔍 Environment DJANGO_ALLOWED_HOSTS: {os.getenv('DJANGO_ALLOWED_HOSTS')}")
```

## Immediate Test Steps

### Step 1: Test with curl
```bash
curl -H "Host: api.eventajou.uz" https://api.eventajou.uz/api/health/
```

### Step 2: Check Specific Log Entries
**Look for these exact patterns:**

**Working:**
```
Host in Allowed: True
🔍 Response Status: 200
```

**Broken:**
```
Host in Allowed: False
🔍 HTTP 400 Response
```

**Missing Headers:**
```
X-Forwarded-Host: None
X-Forwarded-Proto: None
```

## Environment Variable Issues

### Common Syntax Errors
**Wrong:**
```bash
DJANGO_ALLOWED_HOSTS=api.eventajou.uz, eventajou.uz  # Space after comma
DJANGO_ALLOWED_HOSTS="api.eventajou.uz"  # Quotes
```

**Correct:**
```bash
DJANGO_ALLOWED_HOSTS=api.eventajou.uz,eventajou.uz,www.eventajou.uz
```

## Render-Specific Issues

### Issue: Render Internal Host
**Symptoms:**
- Host shows `aem-backend-i4ky.onrender.com`
- ALLOWED_HOSTS doesn't include Render hostname

**Fix:**
```bash
DJANGO_ALLOWED_HOSTS=api.eventajou.uz,aem-backend-i4ky.onrender.com
```

### Issue: SSL Termination
**Symptoms:**
- X-Forwarded-Proto shows `http`
- Requests treated as insecure

**Fix:**
```python
# Force HTTPS in settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## What to Check First

1. **Render Environment Variables** - Verify exact values
2. **Render Logs** - Look for 🔍 debug entries
3. **curl test** - Test from command line
4. **Browser Network Tab** - Check actual headers sent

## Minimal Production Fix

**If all else fails, use this minimal config:**

```python
# backend/config/settings.py
ALLOWED_HOSTS = ['api.eventajou.uz']
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Remove debug middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

**This minimal configuration should work for basic API access.**
