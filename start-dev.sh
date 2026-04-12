#!/bin/bash

echo "🚀 Starting EMW Development Server with Real-time Notifications..."

# Kill any existing processes on ports 8000 and 5173
echo "🔄 Cleaning up existing processes..."
pkill -f "python.*manage.py.*runserver" 2>/dev/null || true
pkill -f "daphne" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 2

echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

echo "🔧 Running database migrations..."
python manage.py migrate 2>/dev/null || echo "⚠️  Migration failed - this is normal if database is not set up"

echo "🌐 Starting WebSocket-enabled backend server..."
# Use daphne for WebSocket support in development
daphne -b 0.0.0.0 -p 8000 config.asgi:application &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 3

echo "🎨 Starting frontend development server..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers started!"
echo "🔗 Frontend: http://localhost:5173"
echo "🔗 Backend API: http://localhost:8000"
echo "🔗 WebSocket: ws://localhost:8000/ws/notifications/"
echo ""
echo "🧪 To test real-time notifications:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Log in as any user"
echo "   3. Run: cd backend && python manage.py test_realtime_notification"
echo "   4. You should see a toast notification appear instantly!"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt signal
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
