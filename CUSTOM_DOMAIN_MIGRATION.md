# Custom Domain Migration Guide

## Overview
Migration from Vercel/Render domains to custom domains:
- **Frontend**: https://eventajou.uz, https://www.eventajou.uz
- **Backend**: https://api.eventajou.uz

## Files Changed

### 1. Frontend Configuration

#### `.env`
- **Changed**: local untracked frontend env file
- **Example**: `VITE_API_BASE_URL=http://127.0.0.1:8000`
- **To**: `VITE_API_BASE_URL=https://api.eventajou.uz`

#### Vercel production environment variables
- Do not commit runtime `.env.production` files
- Set these values in Vercel project environment variables or in a local untracked `.env.production`
- `VITE_API_BASE_URL=https://api.eventajou.uz`
- `VITE_GOOGLE_CLIENT_ID=[your-google-client-id]`

### 2. Backend Configuration

#### `backend/.env.example`
- **Changed**: `DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,testserver`
- **To**: `DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,testserver,api.eventajou.uz`

- **Changed**: `AEM_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`
- **To**: `AEM_CORS_ALLOWED_ORIGINS=https://eventajou.uz,https://www.eventajou.uz,https://aem-one.vercel.app,http://localhost:5173,http://127.0.0.1:5173`

- **Changed**: `AEM_CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`
- **To**: `AEM_CSRF_TRUSTED_ORIGINS=https://eventajou.uz,https://www.eventajou.uz,https://aem-one.vercel.app,http://localhost:5173,http://127.0.0.1:5173`

- **Changed**: Cookie settings for production
  - `AEM_SESSION_COOKIE_SECURE=False` -> `AEM_SESSION_COOKIE_SECURE=True`
  - `AEM_CSRF_COOKIE_SECURE=False` -> `AEM_CSRF_COOKIE_SECURE=True`
  - `AEM_SESSION_COOKIE_SAMESITE=Lax` -> `AEM_SESSION_COOKIE_SAMESITE=None`
  - `AEM_CSRF_COOKIE_SAMESITE=Lax` -> `AEM_CSRF_COOKIE_SAMESITE=None`

#### Render backend environment variables
- Do not commit runtime `backend/.env` or `backend/.env.production` files
- Use `backend/.env.example` as the committed template
- Set production values in Render environment variables or a local untracked backend env file

## Deployment Requirements

### Frontend (Vercel)
1. **Environment Variables to Set**:
   ```
   VITE_API_BASE_URL=https://api.eventajou.uz
   VITE_GOOGLE_CLIENT_ID=386828522213-jgtupfbeokje7klsr65ioi72f4kml5i2.apps.googleusercontent.com
   VITE_SUPABASE_URL=[your-supabase-url]
   VITE_SUPABASE_ANON_KEY=[your-supabase-anon-key]
   VITE_SUPABASE_STORAGE_BUCKET=profile-images
   ```

2. **Redeployment**: Required after environment variables are updated

### Backend (Render)
1. **Environment Variables to Set**:
   ```
   DJANGO_ALLOWED_HOSTS=api.eventajou.uz
   AEM_CORS_ALLOWED_ORIGINS=https://eventajou.uz,https://www.eventajou.uz
   AEM_CSRF_TRUSTED_ORIGINS=https://eventajou.uz,https://www.eventajou.uz
   AEM_GOOGLE_CLIENT_IDS=386828522213-jgtupfbeokje7klsr65ioi72f4kml5i2.apps.googleusercontent.com
   AEM_SESSION_COOKIE_SECURE=True
   AEM_CSRF_COOKIE_SECURE=True
   AEM_SESSION_COOKIE_SAMESITE=None
   AEM_CSRF_COOKIE_SAMESITE=None
   ```

2. **Additional Required Variables**:
   ```
   DJANGO_SECRET_KEY=[production-secret-key]
   DATABASE_URL=[production-database-url]
   AEM_DB_PASSWORD=[production-db-password]
   AEM_DB_HOST=[production-db-host]
   ```

3. **Redeployment**: Required after environment variables are updated

## Google OAuth Update Required

### Google Cloud Console
1. Go to **APIs & Services** -> **Credentials**
2. Edit "AEM Web app" OAuth client
3. **Add to Authorized JavaScript origins**:
   ```
   https://eventajou.uz
   https://www.eventajou.uz
   ```
4. **Add to Authorized redirect URIs**:
   ```
   https://eventajou.uz
   https://www.eventajou.uz
   ```
5. **Remove old origins** (optional but recommended):
   ```
   https://aem-one.vercel.app
   ```

## Verification Steps

### 1. Frontend Verification
- Visit https://eventajou.uz
- Check browser network tab for API requests
- All requests should go to `https://api.eventajou.uz`

### 2. Backend Verification
- Check backend logs for CORS headers
- Verify requests from new domains are accepted

### 3. Authentication Verification
- Test Google OAuth on new domains
- Verify cookies are set correctly
- Test login/logout flow

### 4. WebSocket Verification
- Test real-time notifications
- Verify WebSocket connections work with new domains

## Important Notes

### Cookie Security
- `SameSite=None` required for cross-domain cookies
- `Secure=True` required for HTTPS
- These settings are essential for authentication to work

### CORS Configuration
- Both domains must be in CORS allowed origins
- Both domains must be in CSRF trusted origins
- Include old Vercel domain for backward compatibility during transition

### Google OAuth
- Update both JavaScript origins and redirect URIs
- Test OAuth flow after changes
- May need to clear browser cache

## Troubleshooting

### Common Issues
1. **CORS errors**: Check environment variables are set correctly
2. **Cookie issues**: Verify SameSite=None and Secure=True settings
3. **OAuth failures**: Update Google Cloud Console origins
4. **WebSocket issues**: Check ASGI configuration for new domains

### Debug Steps
1. Check browser console for errors
2. Verify network requests go to correct domains
3. Check backend logs for CORS/CSRF errors
4. Test in incognito mode to rule out cache issues

## Rollback Plan

If issues occur:
1. Revert environment variables to old domains
2. Update Google OAuth back to old domains
3. Redeploy both frontend and backend
4. Test functionality before proceeding again
