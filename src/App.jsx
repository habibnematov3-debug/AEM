import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

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
  participateInEvent,
  signInUser,
  signInWithGoogleCredential,
  signUpUser,
  unlikeEvent,
  updateCurrentUserProfile,
  updateEvent,
  warmUpBackend,
} from './api/aemApi'
import Header from './components/Header'
import { LanguageProvider, useI18n } from './i18n/LanguageContext'
import { getStoredLanguageCode } from './i18n/translations'
import './styles/app.css'
import './styles/pages.css'

const ONBOARDING_STORAGE_KEY_PREFIX = 'aem-onboarding-v1'
const AuthPage = lazy(() => import('./pages/AuthPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const JoinedEventsPage = lazy(() => import('./pages/JoinedEventsPage'))
const OrganizerPage = lazy(() => import('./pages/OrganizerPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const EventCheckInScanPage = lazy(() => import('./pages/EventCheckInScanPage'))
const EventCheckInResultPage = lazy(() => import('./pages/EventCheckInResultPage'))
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const OnboardingTour = lazy(() => import('./components/OnboardingTour'))

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
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const location = useLocation()
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
    if (typeof document === 'undefined') {
      return
    }

    const pathname = location.pathname
    const baseTitle = 'AEM | Ajou University Event Manager and Activities Platform'
    let nextTitle = baseTitle
    let nextDescription =
      'AEM helps Ajou University students discover campus events, join activities, track participation, and manage organizer workflows from one modern event management platform.'

    if (pathname === '/students') {
      nextTitle = 'Student Events Dashboard | AEM Ajou University'
      nextDescription =
        'Browse upcoming Ajou University events, discover recommended activities, and join student programs from the AEM dashboard.'
    } else if (pathname === '/joined-events') {
      nextTitle = 'My Joined Events | AEM Ajou University'
      nextDescription =
        'Track your joined Ajou University events, participation status, and activity history in one place with AEM.'
    } else if (pathname === '/organizer') {
      nextTitle = 'Organizer Workspace | AEM Ajou University'
      nextDescription =
        'Create, manage, and monitor Ajou University events with organizer tools for registrations, updates, and participant engagement.'
    } else if (pathname === '/admin') {
      nextTitle = 'Admin Event Moderation | AEM Ajou University'
      nextDescription =
        'Review, moderate, and manage university event operations securely through the AEM administrative dashboard.'
    } else if (pathname === '/profile') {
      nextTitle = 'User Profile Settings | AEM Ajou University'
      nextDescription =
        'Manage your AEM profile, preferences, and account settings for a personalized Ajou University event experience.'
    } else if (pathname.startsWith('/events/')) {
      nextTitle = 'Event Details | AEM Ajou University'
      nextDescription =
        'Read complete event details, dates, locations, and participation options for Ajou University activities on AEM.'
    }

    document.title = nextTitle

    const descriptionNode = document.querySelector('meta[name="description"]')
    if (descriptionNode) {
      descriptionNode.setAttribute('content', nextDescription)
    }

    const ogTitleNode = document.querySelector('meta[property="og:title"]')
    if (ogTitleNode) {
      ogTitleNode.setAttribute('content', nextTitle)
    }

    const ogDescriptionNode = document.querySelector('meta[property="og:description"]')
    if (ogDescriptionNode) {
      ogDescriptionNode.setAttribute('content', nextDescription)
    }

    const twitterTitleNode = document.querySelector('meta[name="twitter:title"]')
    if (twitterTitleNode) {
      twitterTitleNode.setAttribute('content', nextTitle)
    }

    const twitterDescriptionNode = document.querySelector('meta[name="twitter:description"]')
    if (twitterDescriptionNode) {
      twitterDescriptionNode.setAttribute('content', nextDescription)
    }
  }, [location.pathname])

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

    // Warm up the backend to reduce initial response delays
    warmUpBackend()

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
    if (!authReady || !currentUser || isOnboardingOpen) {
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
  ])

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
      setCurrentUser(result.user)
      return result
    } catch (error) {
      return {
        ok: false,
        message: error.message,
      }
    }
  }

  async function handleGoogleSignIn(credential) {
    try {
      const result = await signInWithGoogleCredential(credential)
      setCurrentUser(result.user)
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
      setCurrentUser(result.user)
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

  async function handleParticipateInEvent(eventId) {
    const result = await participateInEvent(eventId)
    applyEventUpdate(result.event)
    return result
  }

  function handleCloseOnboarding() {
    if (currentUser) {
      markOnboardingSeen(currentUser)
    }

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
          notifications={notifications}
          notificationsLoading={notificationsLoading}
          unreadNotificationsCount={unreadNotificationsCount}
          onMarkNotificationRead={handleMarkNotificationRead}
            onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          />
        )}
        <main id="main-content" className="page-shell" tabIndex={-1}>
          <Suspense
            fallback={
              <section className="page">
                <div className="route-card">
                  <h2>Loading page</h2>
                  <p>Please wait while we load the page.</p>
                </div>
              </section>
            }
          >
            <Routes>
              <Route
                path="/"
                element={
                  <AuthPage
                    onSignIn={handleSignIn}
                    onGoogleSignIn={handleGoogleSignIn}
                    onSignUp={handleSignUp}
                  />
                }
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
                    onParticipateEvent={handleParticipateInEvent}
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
          </Suspense>
        </main>
        {isOnboardingOpen ? (
          <Suspense fallback={null}>
            <OnboardingTour
              key={`${currentUser?.id ?? 'guest'}-${onboardingRole}`}
              role={onboardingRole}
              onClose={handleCloseOnboarding}
              onComplete={handleCloseOnboarding}
            />
          </Suspense>
        ) : null}
      </div>
    </LanguageProvider>
  )
}

export default App
