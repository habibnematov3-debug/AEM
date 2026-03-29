import { useMemo } from 'react'

import EventCard from '../components/EventCard'
import { getCurrentMockUser, studentPageData } from '../data/mockData'
import '../styles/students-events.css'

function StudentsPage({ events = studentPageData.events, searchValue = '' }) {
  const activeUser = getCurrentMockUser() ?? studentPageData.user

  const filteredEvents = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return events
    }

    return events.filter((event) => {
      const haystack = `${event.title} ${event.location} ${event.category}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [events, searchValue])

  return (
    <section className="students-events-page">
      <div className="students-events-page__intro">
        <p className="students-events-page__eyebrow">Welcome, {activeUser.name}</p>
        <h1>Upcoming Events</h1>
        <p>Discover and join exciting events happening at your university</p>
      </div>

      {filteredEvents.length ? (
        <div className="students-events-grid">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} variant="student" />
          ))}
        </div>
      ) : (
        <div className="students-events-empty">
          <h2>No events found</h2>
          <p>Try another keyword in the search bar.</p>
        </div>
      )}
    </section>
  )
}

export default StudentsPage
