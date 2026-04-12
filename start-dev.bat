@echo off
echo 🚀 Starting EMW Development Server with Real-time Notifications...

REM Kill any existing processes on ports 8000 and 5173
echo 🔄 Cleaning up existing processes...
taskkill /F /IM python.exe 2>NUL
taskkill /F /IM node.exe 2>NUL

REM Wait a moment for processes to stop
timeout /t 2 /nobreak >NUL

echo 📦 Installing backend dependencies...
cd backend
pip install -r requirements.txt

echo 🔧 Running database migrations...
python manage.py migrate 2>NUL || echo ⚠️  Migration failed - this is normal if database is not set up

echo 🌐 Starting WebSocket-enabled backend server...
REM Use daphne for WebSocket support in development
start "Backend Server" cmd /c "daphne -b 0.0.0.0 -p 8000 config.asgi:application"

echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak >NUL

echo 🎨 Starting frontend development server...
cd ..
start "Frontend Server" cmd /c "npm run dev"

echo.
echo ✅ Development servers started!
echo 🔗 Frontend: http://localhost:5173
echo 🔗 Backend API: http://localhost:8000
echo 🔗 WebSocket: ws://localhost:8000/ws/notifications/
echo.
echo 🧪 To test real-time notifications:
echo    1. Open http://localhost:5173 in your browser
echo    2. Log in as any user
echo    3. Run: cd backend && python manage.py test_realtime_notification
echo    4. You should see a toast notification appear instantly!
echo.
echo Press any key to stop all servers...
pause >NUL

REM Kill processes when done
taskkill /F /IM python.exe 2>NUL
taskkill /F /IM node.exe 2>NUL
