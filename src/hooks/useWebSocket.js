import { useEffect, useRef, useState, useCallback } from 'react'

export function useWebSocket(currentUser) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [newNotifications, setNewNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const reconnectTimeoutRef = useRef(null)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  const connect = useCallback(() => {
    if (!currentUser?.id || socket?.readyState === WebSocket.OPEN) {
      return
    }

    const token = localStorage.getItem('aem_auth_token')
    if (!token) {
      console.warn('No auth token found for WebSocket connection')
      return
    }

    const wsUrl = `ws://localhost:8000/ws/notifications/?token=${token}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setSocket(ws)
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'notification') {
          setNewNotifications(prev => [data.data, ...prev])
          
          // Show toast notification
          showToastNotification(data.data)
        } else if (data.type === 'unread_count') {
          setUnreadCount(data.count)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      setIsConnected(false)
      setSocket(null)

      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && reconnectTimeoutRef.current === null) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null
          connect()
        }, reconnectDelay)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    return ws
  }, [currentUser?.id, socket])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (socket) {
      socket.close()
      setSocket(null)
      setIsConnected(false)
    }
  }, [socket])

  const clearNewNotifications = useCallback(() => {
    setNewNotifications([])
  }, [])

  // Auto-connect when user changes
  useEffect(() => {
    if (currentUser?.id) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [currentUser?.id, connect, disconnect])

  return {
    isConnected,
    newNotifications,
    unreadCount,
    clearNewNotifications,
    connect,
    disconnect
  }
}

function showToastNotification(notification) {
  // Create a simple toast notification
  const toast = document.createElement('div')
  toast.className = 'notification-toast'
  toast.innerHTML = `
    <div class="toast-content">
      <strong>${notification.title}</strong>
      <p>${notification.message}</p>
      ${notification.link_url ? `<button onclick="window.location.href='${notification.link_url}'">View</button>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `

  // Add styles
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 350px;
    animation: slideIn 0.3s ease-out;
  `

  // Add animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `
  document.head.appendChild(style)

  document.body.appendChild(toast)

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove()
    }
  }, 5000)
}
