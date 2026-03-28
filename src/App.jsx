import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Header from './components/Header'
import { createMockEvent, getCurrentMockUser, getMockEvents, studentPageData } from './data/mockData'
import AuthPage from './pages/AuthPage'
import OrganizerPage from './pages/OrganizerPage'
import StudentsPage from './pages/StudentsPage'
import './styles/app.css'
import './styles/pages.css'

function App() {
  const [studentSearch, setStudentSearch] = useState('')
  const [events, setEvents] = useState(() => getMockEvents())
  const location = useLocation()
  const isAuthPage = location.pathname === '/'
  const isDashboardPage =
    location.pathname === '/students' || location.pathname === '/organizer'

  function handleCreateEvent(eventData) {
    const currentUser = getCurrentMockUser() ?? studentPageData.user
    const createdEvent = createMockEvent({ eventData, currentUser })
    setEvents((currentEvents) => [createdEvent, ...currentEvents])
    return createdEvent
  }

  return (
    <div className="app-shell">
      {!isAuthPage && (
        <Header
          variant={isDashboardPage ? 'students' : 'default'}
          searchValue={studentSearch}
          onSearchChange={setStudentSearch}
        />
      )}
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route
            path="/students"
            element={<StudentsPage events={events} searchValue={studentSearch} />}
          />
          <Route
            path="/organizer"
            element={
              <OrganizerPage
                events={events}
                searchValue={studentSearch}
                onCreateEvent={handleCreateEvent}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
