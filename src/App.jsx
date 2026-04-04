import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import {
  createEvent,
  deleteEvent,
  fetchAdminDashboard,
  fetchCurrentUser,
  fetchEvents,
  fetchMyNotifications,
  fetchOrganizerEvents,
  getDefaultRouteForRole,
  likeEvent,
  logoutUser,
  markAllNotificationsRead,
  markNotificationRead,
  moderateAdminEvent,
  signInUser,
  signUpUser,
  unlikeEvent,
  updateCurrentUserProfile,
  updateEvent,
} from './api/aemApi'
import AdminPage from './pages/AdminPage'
import AdminUsersPage from './pages/AdminUsersPage'
import Header from './components/Header'
import OnboardingTour from './components/OnboardingTour'
import { LanguageProvider, useI18n } from './i18n/LanguageContext'
import { getStoredLanguageCode } from './i18n/translations'
import AuthPage from './pages/AuthPage'
import EventCheckInResultPage from './pages/EventCheckInResultPage'
import EventCheckInScanPage from './pages/EventCheckInScanPage'
import EventDetailsPage from './pages/EventDetailsPage'
import JoinedEventsPage from './pages/JoinedEventsPage'
import OrganizerPage from './pages/OrganizerPage'
import ProfilePage from './pages/ProfilePage'
import StudentsPage from './pages/StudentsPage'
import './styles/app.css'
import './styles/pages.css'

const AUTH_ESTABLISH_ERROR_MESSAGE =
  'Authentication could not be completed. Please sign in again.'
const ONBOARDING_STORAGE_KEY_PREFIX = 'aem-onboarding-v1'

function getOnboardingStorageKey(user) {
  if (!user?.id) {
    return ''
  }

  return `${ONBOARDING_STORAGE_KEY_PREFIX}:${user.id}:${user.role}`
}

function hasSeenOnboarding(user) {
  if (!user?.id || typeof window === 'undefined' || !window.localStorage) {
    return false
  }

  return window.localStorage.getItem(getOnboardingStorageKey(user)) === 'done'
}

function markOnboardingSeen(user) {
  if (!user?.id || typeof window === 'undefined' || !window.localStorage) {
    return
  }

  window.localStorage.setItem(getOnboardingStorageKey(user), 'done')
}

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
  const { t } = useI18n()

  if (!authReady) {
    return (
      <section className="page">
        <div className="route-card">
          <h2>{t('common.loadingAccessTitle')}</h2>
          <p>{t('common.loadingAccessDescription')}</p>
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

function SkipToMain() {
  const { t } = useI18n()

  function handleActivate(event) {
    event.preventDefault()
    const main = document.getElementById('main-content')
    main?.focus({ preventScroll: false })
    const instant =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    main?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <a className="skip-link" href="#main-content" onClick={handleActivate}>
      {t('common.skipToContent')}
    </a>
  )
}

function App() {
  const [studentSearch, setStudentSearch] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [events, setEvents] = useState([])
  const [authReady, setAuthReady] = useState(false)
  const [adminPendingCount, setAdminPendingCount] = useState(0)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [pendingGuideOpen, setPendingGuideOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthPage = location.pathname === '/'
  const isProfilePage = location.pathname === '/profile'
  const isStudentsPage = location.pathname === '/students'
  const isJoinedEventsPage = location.pathname === '/joined-events'
  const isOrganizerPage = location.pathname === '/organizer'
  const isAdminPage = location.pathname === '/admin'
  const shouldLoadEventList = isStudentsPage || isOrganizerPage
  const [eventsLoading, setEventsLoading] = useState(
    () => location.pathname === '/students' || location.pathname === '/organizer',
  )
  const isDashboardPage =
    isStudentsPage ||
    isJoinedEventsPage ||
    isOrganizerPage ||
    isAdminPage ||
    location.pathname.startsWith('/events/') ||
    isProfilePage
  const onboardingRole = currentUser?.role === 'admin' ? 'admin' : 'student'
  const onboardingStartPath = currentUser ? getDefaultRouteForRole(currentUser.role) : '/students'

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
      setAdminPendingCount(0)
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
    if (currentUser) {
      return
    }

    setIsOnboardingOpen(false)
    setPendingGuideOpen(false)
    setNotifications([])
    setUnreadNotificationsCount(0)
  }, [currentUser])

  useEffect(() => {
    let isMounted = true
    let refreshIntervalId = 0

    if (!authReady || !currentUser?.id) {
      setNotifications([])
      setUnreadNotificationsCount(0)
      setNotificationsLoading(false)
      return undefined
    }

    async function loadNotifications() {
      if (isMounted) {
        setNotificationsLoading(true)
      }

      try {
        const payload = await fetchMyNotifications(12)
        if (!isMounted) {
          return
        }

        setNotifications(payload.notifications)
        setUnreadNotificationsCount(payload.unreadCount)
      } catch {
        if (!isMounted) {
          return
        }

        setNotifications([])
        setUnreadNotificationsCount(0)
      } finally {
        if (isMounted) {
          setNotificationsLoading(false)
        }
      }
    }

    loadNotifications()
    refreshIntervalId = window.setInterval(loadNotifications, 60000)

    return () => {
      isMounted = false
      window.clearInterval(refreshIntervalId)
    }
  }, [authReady, currentUser?.id])

  useEffect(() => {
    if (!authReady || !currentUser || pendingGuideOpen || isOnboardingOpen) {
      return
    }

    if (location.pathname !== onboardingStartPath || hasSeenOnboarding(currentUser)) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsOnboardingOpen(true)
    }, 260)

    return () => window.clearTimeout(timeoutId)
  }, [
    authReady,
    currentUser,
    isOnboardingOpen,
    location.pathname,
    onboardingStartPath,
    pendingGuideOpen,
  ])

  useEffect(() => {
    if (!pendingGuideOpen || !currentUser) {
      return
    }

    if (location.pathname !== onboardingStartPath) {
      return
    }

    setIsOnboardingOpen(true)
    setPendingGuideOpen(false)
  }, [currentUser, location.pathname, onboardingStartPath, pendingGuideOpen])

  useEffect(() => {
    let isMounted = true
    let refreshIntervalId = 0

    if (!authReady || currentUser?.role !== 'admin') {
      setAdminPendingCount(0)
      return undefined
    }

    async function refreshAdminPendingCount() {
      try {
        const dashboard = await fetchAdminDashboard()
        if (isMounted) {
          setAdminPendingCount(dashboard.stats.pending)
        }
      } catch {
        if (isMounted) {
          setAdminPendingCount(0)
        }
      }
    }

    refreshAdminPendingCount()
    refreshIntervalId = window.setInterval(refreshAdminPendingCount, 60000)

    return () => {
      isMounted = false
      window.clearInterval(refreshIntervalId)
    }
  }, [authReady, currentUser?.role])

  async function fetchVerifiedCurrentUser() {
    try {
      return await fetchCurrentUser()
    } catch (error) {
      if (error.status === 401) {
        const authError = new Error(AUTH_ESTABLISH_ERROR_MESSAGE)
        authError.status = 401
        throw authError
      }

      throw error
    }
  }

  useEffect(() => {
    if (!shouldLoadEventList) {
      setEventsLoading(false)
      return
    }

    if (isOrganizerPage && (!authReady || !currentUser)) {
      setEventsLoading(false)
      return
    }

    let isMounted = true

    setEventsLoading(true)

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
      } finally {
        if (isMounted) {
          setEventsLoading(false)
        }
      }
    }

    loadEvents()
    return () => {
      isMounted = false
    }
  }, [authReady, currentUser, isOrganizerPage, shouldLoadEventList])

  async function handleSignIn(credentials) {
    try {
      const result = await signInUser(credentials)
      const user = await fetchVerifiedCurrentUser()
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
      const user = await fetchVerifiedCurrentUser()
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
    setAdminPendingCount(0)
  }

  async function handleCreateEvent(eventData) {
    const createdEvent = await createEvent(eventData)
    setEvents((currentEvents) => [createdEvent, ...currentEvents])
    return createdEvent
  }

  function applyEventUpdate(updatedEvent) {
    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
    )
    return updatedEvent
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
    setAdminPendingCount(result.stats.pending)
    return result
  }

  async function handleToggleEventLike(event) {
    const result = event.isLiked ? await unlikeEvent(event.id) : await likeEvent(event.id)
    applyEventUpdate(result.event)
    return result
  }

  function handleOpenGuide() {
    if (!currentUser) {
      return
    }

    if (location.pathname !== onboardingStartPath) {
      setPendingGuideOpen(true)
      navigate(onboardingStartPath)
      return
    }

    setPendingGuideOpen(false)
    setIsOnboardingOpen(true)
  }

  function handleCloseOnboarding() {
    if (currentUser) {
      markOnboardingSeen(currentUser)
    }

    setPendingGuideOpen(false)
    setIsOnboardingOpen(false)
  }

  async function handleMarkNotificationRead(notificationId) {
    try {
      const result = await markNotificationRead(notificationId)
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === String(notificationId)
            ? { ...notification, readAt: result.notification.readAt || notification.readAt }
            : notification,
        ),
      )
      setUnreadNotificationsCount(result.unreadCount)
    } catch {
      // Ignore notification mark failures in the shell; the next refresh will resync state.
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await markAllNotificationsRead()
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.readAt ? notification : { ...notification, readAt: new Date().toISOString() },
        ),
      )
      setUnreadNotificationsCount(0)
    } catch {
      // Ignore notification mark failures in the shell; the next refresh will resync state.
    }
  }

  const activeLanguageCode = currentUser?.settings?.languageCode ?? getStoredLanguageCode()

  return (
    <LanguageProvider languageCode={activeLanguageCode}>
      <div className="app-shell">
        <SkipToMain />
        {!isAuthPage && (
          <Header
            variant={isDashboardPage ? 'students' : 'default'}
            currentUser={currentUser}
            adminPendingCount={adminPendingCount}
            showSearch={!isProfilePage}
            searchValue={studentSearch}
            onSearchChange={setStudentSearch}
            onOpenGuide={handleOpenGuide}
            notifications={notifications}
            notificationsLoading={notificationsLoading}
            unreadNotificationsCount={unreadNotificationsCount}
            onMarkNotificationRead={handleMarkNotificationRead}
            onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          />
        )}
        <main id="main-content" className="page-shell" tabIndex={-1}>
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
                  eventsLoading={eventsLoading}
                  searchValue={studentSearch}
                  onClearSearch={() => setStudentSearch('')}
                  onToggleEventLike={handleToggleEventLike}
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
                    eventsLoading={eventsLoading}
                    searchValue={studentSearch}
                    onCreateEvent={handleCreateEvent}
                    onUpdateEvent={handleUpdateEvent}
                    onDeleteEvent={handleDeleteEvent}
                    onClearSearch={() => setStudentSearch('')}
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
              path="/events/:eventId/check-in"
              element={
                <RequireAuth currentUser={currentUser} authReady={authReady}>
                  <EventCheckInScanPage currentUser={currentUser} />
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/check-in/result"
              element={
                <RequireAuth currentUser={currentUser} authReady={authReady}>
                  <EventCheckInResultPage />
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId"
              element={
                <EventDetailsPage
                  currentUser={currentUser}
                  onToggleEventLike={handleToggleEventLike}
                />
              }
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
        {isOnboardingOpen ? (
          <OnboardingTour
            key={`${currentUser?.id ?? 'guest'}-${onboardingRole}`}
            role={onboardingRole}
            onClose={handleCloseOnboarding}
            onComplete={handleCloseOnboarding}
          />
        ) : null}
      </div>
    </LanguageProvider>
  )
}

export default App
