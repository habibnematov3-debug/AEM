import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useI18n } from '../i18n/LanguageContext'
import { getLanguageLocale } from '../i18n/translations'
import '../styles/event-card.css'

function formatEventDate(eventDate, fallback, languageCode) {
  if (!eventDate) {
    return fallback
  }

  const parsedDate = new Date(`${eventDate}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback || eventDate
  }

  return parsedDate.toLocaleDateString(getLanguageLocale(languageCode), {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function EventCard({
  event,
  variant = 'student',
  currentUser = null,
  onEdit = () => {},
  onDelete = () => {},
  onCancel = () => {},
  onToggleLike = null,
  isCanceling = false,
}) {
  const { languageCode, t } = useI18n()
  const dateText = formatEventDate(event.eventDate, event.date, languageCode)
  const moderationStatus = event.moderationStatus ?? 'pending'
  const [isLikePending, setIsLikePending] = useState(false)

  async function handleLikeToggle(clickEvent) {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()

    if (!currentUser?.id || typeof onToggleLike !== 'function' || isLikePending) {
      return
    }

    setIsLikePending(true)

    try {
      await onToggleLike(event)
    } catch (error) {
      console.error('Could not update event like', error)
    } finally {
      setIsLikePending(false)
    }
  }

  if (variant === 'student') {
    const categoryLabel = event.category?.trim()
    const hasLikesCount = typeof event.likesCount === 'number'
    const canToggleLike = Boolean(currentUser?.id) && typeof onToggleLike === 'function'

    return (
      <article className="event-card event-card--student event-card--interactive">
        <Link
          to={`/events/${event.id}`}
          className="event-card__media-link"
          aria-label={`${t('eventCard.view')}: ${event.title}`}
        >
          <div className="event-card__media">
            <img className="event-card__image" src={event.image} alt={event.title} />
          </div>
        </Link>

        <div className="event-card__body">
          {categoryLabel || event.isJoined || hasLikesCount ? (
            <div className="event-card__student-meta">
              <div className="event-card__student-meta-group">
                {categoryLabel ? (
                  <span className="event-card__category-chip">{categoryLabel}</span>
                ) : null}
                {event.isJoined ? (
                  <span className="event-card__joined-chip">{t('eventCard.joined')}</span>
                ) : null}
              </div>
              {hasLikesCount ? (
                canToggleLike ? (
                  <button
                    type="button"
                    className={
                      event.isLiked
                        ? 'event-card__like-button event-card__likes-chip event-card__likes-chip--liked'
                        : 'event-card__like-button event-card__likes-chip'
                    }
                    onClick={handleLikeToggle}
                    disabled={isLikePending}
                    aria-pressed={event.isLiked}
                    aria-label={`${event.isLiked ? t('eventDetails.likedAction') : t('eventDetails.likeAction')}: ${event.title}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>{t('eventCard.likesCount', { count: event.likesCount })}</span>
                  </button>
                ) : (
                  <span
                    className={
                      event.isLiked
                        ? 'event-card__likes-chip event-card__likes-chip--liked'
                        : 'event-card__likes-chip'
                    }
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>{t('eventCard.likesCount', { count: event.likesCount })}</span>
                  </span>
                )
              ) : null}
            </div>
          ) : null}

          <Link
            to={`/events/${event.id}`}
            className="event-card__content-link"
            aria-label={`${t('eventCard.view')}: ${event.title}`}
          >
            <h3>{event.title}</h3>
            <div className="event-card__detail">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
                  fill="currentColor"
                />
              </svg>
              <span>{dateText}</span>
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
          </Link>
        </div>
      </article>
    )
  }

  if (variant === 'organizer-minimal') {
    return (
      <article className="event-card event-card--student">
        <div className="event-card__media">
          <img className="event-card__image" src={event.image} alt={event.title} />
        </div>
        <div className="event-card__body">
          <div className="event-card__mini-topline">
            <span className="event-card__owner-badge">{t('eventCard.yourEvent')}</span>
            <span
              className={`event-card__moderation-badge event-card__moderation-badge--${moderationStatus}`}
            >
              {t(`organizerPage.statuses.${moderationStatus}`)}
            </span>
          </div>

          <h3>{event.title}</h3>
          <p className="event-card__status-copy">
            {t(`organizerPage.statusMessages.${moderationStatus}`)}
          </p>
          <div className="event-card__detail">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
                fill="currentColor"
              />
            </svg>
            <span>{dateText}</span>
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

          <div className="event-card__actions">
            <button
              type="button"
              className="event-card__action-button"
              onClick={() => onEdit(event)}
            >
              {t('eventCard.edit')}
            </button>
            <Link
              to={`/events/${event.id}`}
              className="event-card__action-button event-card__action-button--ghost"
            >
              {t('eventCard.view')}
            </Link>
            <button
              type="button"
              className="event-card__action-button event-card__action-button--danger"
              onClick={() => onDelete(event)}
            >
              {t('eventCard.delete')}
            </button>
          </div>
        </div>
      </article>
    )
  }

  if (variant === 'joined') {
    return (
      <article className="event-card event-card--student">
        <div className="event-card__media">
          <img className="event-card__image" src={event.image} alt={event.title} />
        </div>
        <div className="event-card__body">
          <div className="event-card__mini-topline">
            <span className="event-card__owner-badge">{t('eventDetails.joined')}</span>
            <span className="event-card__joined-meta">
              {t('joinedEventsPage.joinedOn', { date: dateText })}
            </span>
          </div>

          <h3>{event.title}</h3>
          <div className="event-card__detail">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
                fill="currentColor"
              />
            </svg>
            <span>{dateText}</span>
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

          <div className="event-card__actions">
            <Link
              to={`/events/${event.id}`}
              className="event-card__action-button event-card__action-button--ghost"
            >
              {t('eventCard.view')}
            </Link>
            <button
              type="button"
              className="event-card__action-button event-card__action-button--danger"
              onClick={() => onCancel(event)}
              disabled={isCanceling}
            >
              {isCanceling ? t('joinedEventsPage.cancelling') : t('joinedEventsPage.cancelParticipation')}
            </button>
          </div>
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
            {event.joinedCount} joined
            {event.capacity ? ` / ${event.capacity}` : ''}
            {event.waitlistCount ? ` · ${event.waitlistCount} waitlisted` : ''}
            {event.noShowCount ? ` · ${event.noShowCount} no-show` : ''}
        )}
      </div>
    </article>
  )
}

export default EventCard
