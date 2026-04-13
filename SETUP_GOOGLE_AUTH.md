# Google Authentication Setup Guide

## Problem
The "Continue with Google" button is not working because Google Client ID is not configured.

## Solution Steps

### 1. Get Google Client ID

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create/Select Project**
   - Create a new project or select existing one
   - Project name: "AEM" or "Academic Event Manager"

3. **Enable Google Identity API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Identity"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "AEM Web App"

5. **Configure Authorized Origins**
   - Add these to "Authorized JavaScript origins":
     ```
     http://localhost:5173
     http://127.0.0.1:5173
     ```
   - Add these to "Authorized redirect URIs":
     ```
     http://localhost:5173
     http://127.0.0.1:5173
     ```

6. **Copy Client ID**
   - After creation, copy the "Client ID" (starts with "....googleusercontent.com")

### 2. Configure Environment Variables

**Frontend Configuration (.env):**
```bash
VITE_GOOGLE_CLIENT_ID=your-actual-google-client-id-here
```

**Backend Configuration (backend/.env):**
```bash
AEM_GOOGLE_CLIENT_IDS=your-actual-google-client-id-here
```

### 3. Restart Development Servers

After updating environment variables:
1. Stop all running servers
2. Restart frontend: `npm run dev`
3. Restart backend: `python manage.py runserver` or use `start-dev.bat`

### 4. Test Google Authentication

1. Open http://localhost:5173
2. Click "Continue with Google"
3. Should open Google sign-in popup
4. Sign in with your Google account
5. Should redirect back to AEM logged in

## Troubleshooting

### Button Still Disabled?
- Check browser console for errors
- Verify Client ID is correctly copied
- Ensure no extra spaces in environment variables

### "Google sign-in is unavailable" Error?
- Check backend logs for Google token verification errors
- Verify Google Identity API is enabled
- Check network connectivity

### CORS Errors?
- Verify your domain is in "Authorized JavaScript origins"
- Check backend CORS settings

## Security Notes

- **Never commit** `.env` files to version control
- Use different Client IDs for development and production
- Regularly rotate Client IDs if compromised
- Monitor Google Cloud Console for suspicious activity

## Production Deployment

For production (Render/Heroku/etc):
1. Add production domain to "Authorized JavaScript origins"
2. Update environment variables in deployment platform
3. Use HTTPS URLs (required for production)

## Current Status

- ✅ Frontend code is correctly implemented
- ✅ Backend Google auth endpoints are ready
- ❌ Environment variables need configuration
- ❌ Google Client ID needs to be obtained

Once you configure the Google Client ID, the button will work perfectly!
