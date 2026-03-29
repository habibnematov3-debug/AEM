import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { fetchEventById, participateInEvent } from '../api/aemApi'
import '../styles/event-details.css'

function EventDetailsPage({ currentUser }) {
  const navigate = useNavigate()
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' })
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadEvent() {
      setStatus('loading')
      setErrorMessage('')
      setActionFeedback({ type: '', message: '' })

      try {
        const fetchedEvent = await fetchEventById(eventId)
        if (!isMounted) {
          return
        }

        setEvent(fetchedEvent)
        setStatus('ready')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setEvent(null)
        if (error.status === 404) {
          setStatus('not-found')
          return
        }

        setErrorMessage(error.message || 'Could not load the event details.')
        setStatus('error')
      }
    }

    loadEvent()

    return () => {
      isMounted = false
    }
  }, [eventId])

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/students')
  }

  async function handleParticipate() {
    if (!event || !currentUser || isJoining || event.isJoined) {
      return
    }

    setIsJoining(true)
    setActionFeedback({ type: '', message: '' })

    try {
      const result = await participateInEvent(event.id)
      setEvent(result.event)
      setActionFeedback({ type: 'success', message: result.message })
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: error.message || 'Could not join this event.',
      })
    } finally {
      setIsJoining(false)
    }
  }

  if (status === 'loading') {
    return (
      <section className="event-details-page">
        <div className="event-details-empty event-details-empty--info">
          <button type="button" className="event-details-back" onClick={handleBack}>
            Back to Events
          </button>
          <h1>Loading event...</h1>
          <p>Fetching the latest event details from the backend.</p>
        </div>
      </section>
    )
  }

  if (status === 'not-found') {
    return (
      <section className="event-details-page">
        <div className="event-details-empty">
          <button type="button" className="event-details-back" onClick={handleBack}>
            Back to Events
          </button>
          <h1>Event not found</h1>
          <p>The event you are trying to open does not exist.</p>
        </div>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="event-details-page">
        <div className="event-details-empty event-details-empty--error">
          <button type="button" className="event-details-back" onClick={handleBack}>
            Back to Events
          </button>
          <h1>Could not load event</h1>
          <p>{errorMessage}</p>
        </div>
      </section>
    )
  }

  const isCreator = Boolean(currentUser?.id) && currentUser.id === event.creatorId
  const canParticipate = Boolean(currentUser?.id) && !isCreator
  const hasJoined = Boolean(event.isJoined)

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

          <div className="event-details-actions">
            {canParticipate ? (
              <button
                type="button"
                className="event-details-primary"
                onClick={handleParticipate}
                disabled={isJoining || hasJoined}
              >
                {hasJoined ? 'Joined' : isJoining ? 'Joining...' : 'Participate'}
              </button>
            ) : isCreator ? (
              <p className="event-details-inline-note">You created this event.</p>
            ) : (
              <p className="event-details-inline-note">Sign in to join this event.</p>
            )}

            {actionFeedback.message ? (
              <p
                className={
                  actionFeedback.type === 'error'
                    ? 'event-details-feedback event-details-feedback--error'
                    : 'event-details-feedback event-details-feedback--success'
                }
              >
                {actionFeedback.message}
              </p>
            ) : null}
          </div>

          <div className="event-details-grid">
            <div className="event-details-item">
              <span>Date</span>
              <strong>{event.date}</strong>
            </div>
            <div className="event-details-item">
              <span>Start time</span>
              <strong>{event.startTime || 'TBD'}</strong>
            </div>
            <div className="event-details-item">
              <span>End time</span>
              <strong>{event.endTime || 'TBD'}</strong>
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
              <strong>{event.creatorName || event.organizerName || 'Unknown organizer'}</strong>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

export default EventDetailsPage
