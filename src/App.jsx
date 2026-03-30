import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import {
  createEvent,
  deleteEvent,
  fetchCurrentUser,
  fetchEvents,
  getStoredCurrentUser,
  logoutUser,
  signInUser,
  signUpUser,
  updateCurrentUserProfile,
  updateEvent,
} from './api/aemApi'
import Header from './components/Header'
import AuthPage from './pages/AuthPage'
import EventDetailsPage from './pages/EventDetailsPage'
import OrganizerPage from './pages/OrganizerPage'
import ProfilePage from './pages/ProfilePage'
import StudentsPage from './pages/StudentsPage'
import './styles/app.css'
import './styles/pages.css'

function RequireAuth({ currentUser, authReady, children }) {
  if (!authReady) {
    return (
      <section className="page">
        <div className="route-card">
          <h2>Loading profile...</h2>
          <p>Checking your account session.</p>
        </div>
      </section>
    )
  }

  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const [studentSearch, setStudentSearch] = useState('')
  const [currentUser, setCurrentUser] = useState(() => getStoredCurrentUser())
  const [events, setEvents] = useState([])
  const [authReady, setAuthReady] = useState(false)
  const location = useLocation()
  const isAuthPage = location.pathname === '/'
  const isProfilePage = location.pathname === '/profile'
  const shouldLoadEventList =
    location.pathname === '/students' || location.pathname === '/organizer'
  const isDashboardPage =
    location.pathname === '/students' ||
    location.pathname === '/organizer' ||
    location.pathname.startsWith('/events/') ||
    isProfilePage

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      try {
        const user = await fetchCurrentUser()
        if (isMounted) {
          setCurrentUser(user)
        }
      } catch (error) {
        if (isMounted && error.status === 401) {
          setCurrentUser(null)
        }
      } finally {
        if (isMounted) {
          setAuthReady(true)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = currentUser?.settings?.theme ?? 'light'
  }, [currentUser])

  useEffect(() => {
    if (!shouldLoadEventList) {
      return
    }

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
  }, [shouldLoadEventList])

  async function handleSignIn(credentials) {
    try {
      const result = await signInUser(credentials)
      const user = await fetchCurrentUser().catch(() => result.user)
      setCurrentUser(user)
      return { ...result, user }
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

  async function handleProfileUpdate(profileData) {
    const result = await updateCurrentUserProfile(profileData)
    setCurrentUser(result.user)
    return result
  }

  async function handleLogout() {
    await logoutUser()
    setCurrentUser(null)
  }

  async function handleCreateEvent(eventData) {
    const createdEvent = await createEvent(eventData)
    setEvents((currentEvents) => [createdEvent, ...currentEvents])
    return createdEvent
  }

  async function handleUpdateEvent(eventId, eventData) {
    const updatedEvent = await updateEvent(eventId, eventData)
    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
    )
    return updatedEvent
  }

  async function handleDeleteEvent(eventId) {
    const result = await deleteEvent(eventId)
    setEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== result.deletedEventId),
    )
    return result
  }

  return (
    <div className="app-shell">
      {!isAuthPage && (
        <Header
          variant={isDashboardPage ? 'students' : 'default'}
          currentUser={currentUser}
          showSearch={!isProfilePage}
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
              <RequireAuth currentUser={currentUser} authReady={authReady}>
                <OrganizerPage
                  currentUser={currentUser}
                  events={events}
                  searchValue={studentSearch}
                  onCreateEvent={handleCreateEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/events/:eventId"
            element={<EventDetailsPage currentUser={currentUser} />}
          />
          <Route
            path="/profile"
            element={
              <RequireAuth currentUser={currentUser} authReady={authReady}>
                <ProfilePage
                  currentUser={currentUser}
                  onUpdateProfile={handleProfileUpdate}
                  onLogout={handleLogout}
                />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
