import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Header from './components/Header'
import {
  createMockEvent,
  deleteMockEvent,
  getCurrentMockUser,
  getDefaultCurrentMockUser,
  getMockEvents,
  getMockUsers,
  signInMockUser,
  signUpMockUser,
  updateMockEvent,
} from './data/mockData'
import AuthPage from './pages/AuthPage'
import EventDetailsPage from './pages/EventDetailsPage'
import OrganizerPage from './pages/OrganizerPage'
import StudentsPage from './pages/StudentsPage'
import './styles/app.css'
import './styles/pages.css'

function App() {
  const [studentSearch, setStudentSearch] = useState('')
  const [users, setUsers] = useState(() => getMockUsers())
  const [currentUser, setCurrentUser] = useState(
    () => getCurrentMockUser() ?? getDefaultCurrentMockUser(),
  )
  const [events, setEvents] = useState(() => getMockEvents())
  const location = useLocation()
  const isAuthPage = location.pathname === '/'
  const isDashboardPage =
    location.pathname === '/students' ||
    location.pathname === '/organizer' ||
    location.pathname.startsWith('/events/')

  const demoAccount = users.find((user) => user.id === 'student-1') ?? getDefaultCurrentMockUser()

  function handleSignIn(credentials) {
    const result = signInMockUser(credentials)
    if (result.ok) {
      setCurrentUser(result.user)
    }

    return result
  }

  function handleSignUp(payload) {
    const result = signUpMockUser(payload)
    if (result.ok) {
      setUsers(getMockUsers())
    }

    return result
  }

  function handleCreateEvent(eventData) {
    const activeUser = currentUser ?? getDefaultCurrentMockUser()
    const createdEvent = createMockEvent({ eventData, currentUser: activeUser })
    setEvents((currentEvents) => [createdEvent, ...currentEvents])
    return createdEvent
  }

  function handleUpdateEvent(eventId, eventData) {
    const updatedEvent = updateMockEvent({ eventId, eventData })
    if (!updatedEvent) {
      return null
    }

    setEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === eventId ? updatedEvent : event)),
    )
    return updatedEvent
  }

  function handleDeleteEvent(eventId) {
    const wasDeleted = deleteMockEvent(eventId)
    if (!wasDeleted) {
      return false
    }

    setEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId))
    return true
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
            element={
              <AuthPage
                demoAccount={demoAccount}
                onSignIn={handleSignIn}
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
