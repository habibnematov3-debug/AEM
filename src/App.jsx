import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import {
  createEvent,
  deleteEvent,
  fetchAdminDashboard,
  fetchCurrentUser,
  fetchEvents,
  fetchOrganizerEvents,
  getDefaultRouteForRole,
  logoutUser,
  moderateAdminEvent,
  signInUser,
  signUpUser,
  updateCurrentUserProfile,
  updateEvent,
} from './api/aemApi'
import AdminPage from './pages/AdminPage'
import AdminUsersPage from './pages/AdminUsersPage'
import Header from './components/Header'
import { LanguageProvider, useI18n } from './i18n/LanguageContext'
import { getStoredLanguageCode } from './i18n/translations'
import AuthPage from './pages/AuthPage'
import EventDetailsPage from './pages/EventDetailsPage'
import JoinedEventsPage from './pages/JoinedEventsPage'
import OrganizerPage from './pages/OrganizerPage'
import ProfilePage from './pages/ProfilePage'
import StudentsPage from './pages/StudentsPage'
import './styles/app.css'
import './styles/pages.css'

function RequireAuth({ currentUser, authReady, children }) {
  const { t } = useI18n()

  if (!authReady) {
    return (
      <section className="page">
        <div className="route-card">
          <h2>{t('common.loadingProfileTitle')}</h2>
          <p>{t('common.loadingProfileDescription')}</p>
        </div>
      </section>
    )
  }

  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  return children
}

function RequireRole({ currentUser, authReady, allowedRoles, children }) {
  if (!authReady) {
    return (
      <section className="page">
        <div className="route-card">
          <h2>Loading access...</h2>
          <p>Checking the permissions for this page.</p>
        </div>
      </section>
    )
  }

  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />
  }

  return children
}

function App() {
  const [studentSearch, setStudentSearch] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [events, setEvents] = useState([])
  const [authReady, setAuthReady] = useState(false)
  const location = useLocation()
  const isAuthPage = location.pathname === '/'
  const isProfilePage = location.pathname === '/profile'
  const isStudentsPage = location.pathname === '/students'
  const isJoinedEventsPage = location.pathname === '/joined-events'
  const isOrganizerPage = location.pathname === '/organizer'
  const isAdminPage = location.pathname === '/admin'
  const shouldLoadEventList = isStudentsPage || isOrganizerPage
  const isDashboardPage =
    isStudentsPage ||
    isJoinedEventsPage ||
    isOrganizerPage ||
    isAdminPage ||
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
    function handleUnauthorized() {
      setCurrentUser(null)
      setEvents([])
      setAuthReady(true)
    }

    window.addEventListener('aem:unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('aem:unauthorized', handleUnauthorized)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = currentUser?.settings?.theme ?? 'light'
  }, [currentUser])

  useEffect(() => {
    if (!shouldLoadEventList) {
      return
    }

    if (isOrganizerPage && (!authReady || !currentUser)) {
      return
    }

    let isMounted = true

    async function loadEvents() {
      try {
        const fetchedEvents = isOrganizerPage ? await fetchOrganizerEvents() : await fetchEvents()
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
  }, [isOrganizerPage, shouldLoadEventList])

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

  async function handleModerateEvent(eventId, moderationStatus) {
    const result = await moderateAdminEvent(eventId, moderationStatus)
    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === result.event.id ? result.event : event)),
    )
    return result
  }

  const activeLanguageCode = currentUser?.settings?.languageCode ?? getStoredLanguageCode()

  return (
    <LanguageProvider languageCode={activeLanguageCode}>
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
              path="/joined-events"
              element={
                <RequireAuth currentUser={currentUser} authReady={authReady}>
                  <JoinedEventsPage
                    currentUser={currentUser}
                    searchValue={studentSearch}
                  />
                </RequireAuth>
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
              path="/admin"
              element={
                <RequireRole currentUser={currentUser} authReady={authReady} allowedRoles={['admin']}>
                  <AdminPage
                    currentUser={currentUser}
                    onModerateEvent={handleModerateEvent}
                    onLoadStats={fetchAdminDashboard}
                  />
                </RequireRole>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireRole currentUser={currentUser} authReady={authReady} allowedRoles={['admin']}>
                  <AdminUsersPage currentUser={currentUser} />
                </RequireRole>
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
    </LanguageProvider>
  )
}

export default App
