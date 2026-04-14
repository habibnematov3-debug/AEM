# Login Debug Guide

## Problem Analysis
Login request reaches backend but returns HTTP 400. Below is the complete analysis and debugging setup.

## Login Flow Analysis

### Frontend Request
- **URL**: `https://api.eventajou.uz/api/auth/login/`
- **Method**: POST
- **Content-Type**: application/json
- **Credentials**: include (for cookies)
- **Body**: 
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Backend Endpoint
- **View**: `LoginAPIView` in `backend/accounts/views.py`
- **URL**: `/api/auth/login/`
- **Method**: POST
- **CSRF**: Exempt (`@csrf_exempt`)
- **Serializer**: `LoginSerializer`

### Backend Validation
1. **Email Field**: `EmailField(max_length=254)`
2. **Password Field**: `CharField(write_only=True, trim_whitespace=False)`
3. **Validation Logic**:
   - Email: `email.strip().lower()`
   - User lookup: `AEMUser.objects.filter(email__iexact=email).first()`
   - Password check: `user.check_password(password)`
   - Active check: `user.is_active`

## Debugging Changes Made

### 1. Frontend Debug Logging (`src/api/aemApi.js`)
```javascript
console.log('🔍 Login Request Debug:', {
  url: `${API_BASE_URL}/api/auth/login/`,
  method: 'POST',
  payload: {
    email: credentials.email,
    password: credentials.password,
  },
})

console.log('🔍 Login Response Debug:', payload)

if (!payload.auth_token || !payload.user) {
  console.error('🔍 Login Error - Invalid Response:', payload)
  throw new Error(payload.detail || payload.message || 'Login failed. Please check your credentials.')
}
```

### 2. Backend Debug Logging (`backend/accounts/views.py`)
```python
def post(self, request):
    print(f"🔍 Login Request Debug:")
    print(f"  Headers: {dict(request.headers)}")
    print(f"  Data: {request.data}")
    print(f"  Method: {request.method}")
    print(f"  Content-Type: {request.content_type}")
    
    serializer = LoginSerializer(data=request.data)
    
    try:
        serializer.is_valid(raise_exception=True)
    except Exception as e:
        print(f"🔍 Serializer Validation Error: {e}")
        print(f"🔍 Serializer Errors: {serializer.errors}")
        raise
```

### 3. Frontend Error Handling (`src/pages/AuthPage.jsx`)
```javascript
try {
  const result = await onSignIn({...})
  // Handle success
} catch (error) {
  console.error('🔍 Login Submit Error:', error)
  setFeedback({ type: 'error', message: error.message || 'Login failed. Please try again.' })
  setIsSubmitting(false)
}
```

## Possible HTTP 400 Causes

### 1. CORS Issues
- **Symptom**: Request blocked before reaching backend
- **Check**: Browser console for CORS errors
- **Fix**: Verify `AEM_CORS_ALLOWED_ORIGINS` includes `https://eventajou.uz`

### 2. CSRF Issues
- **Symptom**: CSRF token missing/invalid
- **Check**: Backend logs for CSRF errors
- **Fix**: Ensure `@csrf_exempt` is working

### 3. Serializer Validation Errors
- **Symptom**: Invalid email/password format
- **Check**: Backend logs for serializer errors
- **Fix**: Ensure valid email and password

### 4. Authentication Issues
- **Symptom**: Invalid credentials
- **Check**: Backend logs for user lookup/password check
- **Fix**: Verify user exists and password is correct

### 5. Database Connection Issues
- **Symptom**: User lookup fails
- **Check**: Backend logs for database errors
- **Fix**: Verify database connection and user data

## Testing Steps

### 1. Deploy Debug Version
1. Deploy frontend changes to Vercel
2. Deploy backend changes to Render
3. Wait for deployments to complete

### 2. Test Login
1. Open browser developer console
2. Go to https://eventajou.uz
3. Try to login with valid credentials
4. Check console for debug logs
5. Check backend logs for debug output

### 3. Analyze Results
1. **Frontend Console**: Look for request/response debug logs
2. **Backend Logs**: Look for request data and validation errors
3. **Network Tab**: Check request/response details

## Expected Debug Output

### Successful Login
**Frontend Console:**
```
🔍 Login Request Debug: {url: "https://api.eventajou.uz/api/auth/login/", method: "POST", payload: {...}}
🔍 Login Response Debug: {auth_token: "...", user: {...}, message: "Login successful."}
```

**Backend Logs:**
```
🔍 Login Request Debug:
  Headers: {...}
  Data: {'email': 'user@example.com', 'password': 'password123'}
  Method: POST
  Content-Type: application/json
```

### Failed Login (HTTP 400)
**Frontend Console:**
```
🔍 Login Request Debug: {...}
🔍 Login Response Debug: {detail: "Invalid email or password."}
🔍 Login Error - Invalid Response: {...}
```

**Backend Logs:**
```
🔍 Login Request Debug: {...}
🔍 Serializer Validation Error: Invalid email or password.
🔍 Serializer Errors: {'detail': 'Invalid email or password.'}
```

## Common Issues and Solutions

### Issue 1: CORS Errors
**Console Error**: "Access to fetch at 'https://api.eventajou.uz/api/auth/login/' from origin 'https://eventajou.uz' has been blocked by CORS policy"

**Solution**: 
1. Check Render environment variables
2. Ensure `AEM_CORS_ALLOWED_ORIGINS=https://eventajou.uz,https://www.eventajou.uz`
3. Redeploy backend

### Issue 2: Invalid Credentials
**Backend Logs**: Shows user not found or password mismatch

**Solution**:
1. Verify user exists in database
2. Check password is correct
3. Ensure user is active

### Issue 3: Request Format Issues
**Backend Logs**: Shows missing or malformed data

**Solution**:
1. Check frontend request payload
2. Ensure Content-Type is application/json
3. Verify email/password field names

## Next Steps

1. **Deploy debug changes** to both frontend and backend
2. **Test login** and collect debug output
3. **Analyze logs** to identify exact issue
4. **Apply fix** based on findings
5. **Remove debug logs** once issue is resolved

## Production Cleanup

After fixing the issue, remove debug logging:

### Frontend
```javascript
// Remove console.log statements from signInUser function
```

### Backend
```python
# Remove print statements from LoginAPIView.post method
```

This will clean up the code and remove sensitive information from production logs.
