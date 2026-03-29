import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import '../styles/event-details.css'

function EventDetailsPage({ events = [], users = [] }) {
  const navigate = useNavigate()
  const { eventId } = useParams()

  const event = useMemo(
    () => events.find((currentEvent) => currentEvent.id === eventId) ?? null,
    [eventId, events],
  )

  const organizerName = event
    ? event.organizerName ??
      users.find((user) => user.id === event.creatorId)?.name ??
      users.find((user) => user.id === event.organizerId)?.name ??
      'Unknown organizer'
    : ''

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/students')
  }

  if (!event) {
    return (
      <section className="event-details-page">
        <div className="event-details-empty">
          <button type="button" className="event-details-back" onClick={handleBack}>
            Back to Events
          </button>
          <h1>Event not found</h1>
          <p>The event you are trying to open does not exist in the current mock state.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="event-details-page">
      <button type="button" className="event-details-back" onClick={handleBack}>
        Back to Events
      </button>

      <article className="event-details-card">
        <img className="event-details-cover" src={event.image} alt={event.title} />

        <div className="event-details-content">
          <div className="event-details-topline">
            <span className="event-details-badge">{event.category || 'General'}</span>
            <span className="event-details-status">{event.status}</span>
          </div>

          <h1>{event.title}</h1>
          <p className="event-details-description">{event.description}</p>

          <div className="event-details-grid">
            <div className="event-details-item">
              <span>Date</span>
              <strong>{event.date}</strong>
            </div>
            <div className="event-details-item">
              <span>Start time</span>
              <strong>{event.startTime ?? event.time ?? 'TBD'}</strong>
            </div>
            <div className="event-details-item">
              <span>End time</span>
              <strong>{event.endTime ?? 'TBD'}</strong>
            </div>
            <div className="event-details-item">
              <span>Location</span>
              <strong>{event.location}</strong>
            </div>
            <div className="event-details-item">
              <span>Category</span>
              <strong>{event.category || 'General'}</strong>
            </div>
            <div className="event-details-item">
              <span>Organizer</span>
              <strong>{organizerName}</strong>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

export default EventDetailsPage
