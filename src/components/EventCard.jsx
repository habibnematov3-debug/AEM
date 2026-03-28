import '../styles/event-card.css'

function EventCard({ event, variant = 'student' }) {
  if (variant === 'student' || variant === 'organizer-minimal') {
    return (
      <article className="event-card event-card--student">
        <img className="event-card__image" src={event.image} alt={event.title} />
        <div className="event-card__body">
          {variant === 'organizer-minimal' ? (
            <div className="event-card__mini-topline">
              <span className="event-card__owner-badge">Your Event</span>
            </div>
          ) : null}

          <h3>{event.title}</h3>
          <div className="event-card__detail">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
                fill="currentColor"
              />
            </svg>
            <span>{event.date}</span>
          </div>
          <div className="event-card__detail">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 4.86 5.18 10.83 5.4 11.08a1.12 1.12 0 0 0 1.7 0c.22-.25 5.4-6.22 5.4-11.08A6.25 6.25 0 0 0 12 2.75Zm0 8.5A2.25 2.25 0 1 1 12 6.75a2.25 2.25 0 0 1 0 4.5Z"
                fill="currentColor"
              />
            </svg>
            <span>{event.location}</span>
          </div>

          {variant === 'organizer-minimal' ? (
            <div className="event-card__actions">
              <button type="button" className="event-card__action-button">
                Edit
              </button>
              <button type="button" className="event-card__action-button event-card__action-button--ghost">
                View
              </button>
            </div>
          ) : null}
        </div>
      </article>
    )
  }

  return (
    <article className="event-card">
      <div className="event-card__topline">
        <span className="event-card__badge">{event.category}</span>
        <span
          className={
            event.status === 'Open'
              ? 'event-card__status event-card__status--open'
              : 'event-card__status event-card__status--muted'
          }
        >
          {event.status}
        </span>
      </div>

      <h3>{event.title}</h3>
      <p className="event-card__description">{event.description}</p>

      <div className="event-card__meta">
        <span>{event.date}</span>
        <span>{event.time}</span>
        <span>{event.venue}</span>
        <span>{event.city}</span>
      </div>

      <div className="event-card__footer">
        <div>
          <strong>{event.priceLabel}</strong>
          <p>
            {event.registeredCount}/{event.capacity} joined
          </p>
        </div>

        {variant === 'organizer' ? (
          <p className="event-card__cta">Manage registrations</p>
        ) : (
          <p className="event-card__cta">View details</p>
        )}
      </div>
    </article>
  )
}

export default EventCard
