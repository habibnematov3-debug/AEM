import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import {
  createEvent,
  fetchEvents,
  getStoredCurrentUser,
  signInUser,
  signUpUser,
} from './api/aemApi'
import Header from './components/Header'
import AuthPage from './pages/AuthPage'
import EventDetailsPage from './pages/EventDetailsPage'
import OrganizerPage from './pages/OrganizerPage'
import StudentsPage from './pages/StudentsPage'
import './styles/app.css'
import './styles/pages.css'

function App() {
  const [studentSearch, setStudentSearch] = useState('')
  const [currentUser, setCurrentUser] = useState(() => getStoredCurrentUser())
  const [users, setUsers] = useState(() => {
    const storedUser = getStoredCurrentUser()
    return storedUser ? [storedUser] : []
  })
  const [events, setEvents] = useState([])
  const location = useLocation()
  const isAuthPage = location.pathname === '/'
  const isDashboardPage =
    location.pathname === '/students' ||
    location.pathname === '/organizer' ||
    location.pathname.startsWith('/events/')

  useEffect(() => {
    let isMounted = true

    async function loadEvents() {
      try {
        const fetchedEvents = await fetchEvents()
        if (isMounted) {
          setEvents(fetchedEvents)
        }
      } catch {
        if (isMounted) {
          setEvents([])
        }
      }
    }

    loadEvents()
    return () => {
      isMounted = false
    }
  }, [])

  async function handleSignIn(credentials) {
    try {
      const result = await signInUser(credentials)
      setCurrentUser(result.user)
      setUsers(result.user ? [result.user] : [])
      return result
    } catch (error) {
      return {
        ok: false,
        message: error.message,
      }
    }
  }

  async function handleSignUp(payload) {
    try {
      const result = await signUpUser(payload)
      return result
    } catch (error) {
      return {
        ok: false,
        message: error.message,
      }
    }
  }

  async function handleCreateEvent(eventData) {
    const createdEvent = await createEvent(eventData)
    setEvents((currentEvents) => [createdEvent, ...currentEvents])
    return createdEvent
  }

  function handleUpdateEvent() {
    return null
  }

  function handleDeleteEvent() {
    return false
  }

  return (
    <div className="app-shell">
      {!isAuthPage && (
        <Header
          variant={isDashboardPage ? 'students' : 'default'}
          currentUser={currentUser}
          searchValue={studentSearch}
          onSearchChange={setStudentSearch}
        />
      )}
      <main className="page-shell">
        <Routes>
          <Route
            path="/"
            element={<AuthPage onSignIn={handleSignIn} onSignUp={handleSignUp} />}
          />
          <Route
            path="/students"
            element={
              <StudentsPage
                currentUser={currentUser}
                events={events}
                searchValue={studentSearch}
              />
            }
          />
          <Route
            path="/organizer"
            element={
              <OrganizerPage
                currentUser={currentUser}
                events={events}
                searchValue={studentSearch}
                onCreateEvent={handleCreateEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            }
          />
          <Route
            path="/events/:eventId"
            element={<EventDetailsPage events={events} users={users} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
