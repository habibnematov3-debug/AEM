import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useI18n } from '../i18n/LanguageContext'
import { getLanguageLocale } from '../i18n/translations'
import { getCategoryColor, getCategoryLabel } from '../constants/eventCategories'
import '../styles/compact-event-card.css'

function IconEye({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C20.27 7.61 17 4.5 12 4.5z"
      />
    </svg>
  )
}

function IconPencil({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 2.75 2.75 1.83-1.83Z"
      />
    </svg>
  )
}

function IconTrash({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9Zm0 5h2v9H9V8Zm4 0h2v9h-2V8Z"
      />
    </svg>
  )
}

function formatEventDate(eventDate, fallback, languageCode) {
  if (!eventDate) {
    return fallback
  }

  const parsedDate = new Date(`${eventDate}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback || eventDate
  }

  return parsedDate.toLocaleDateString(getLanguageLocale(languageCode), {
    month: 'short',
    day: 'numeric',
  })
}

function formatTimestampDate(timestamp, fallback, languageCode) {
  if (!timestamp) {
    return fallback
  }

  const parsedDate = new Date(timestamp)
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback
  }

  return parsedDate.toLocaleDateString(getLanguageLocale(languageCode), {
    month: 'short',
    day: 'numeric',
  })
}

function getEventLifecycle(event, now = Date.now()) {
  if (!event?.eventDate) {
    return null
  }

  const startTime = event.startTime || '00:00'
  const endTime = event.endTime || startTime
  const start = new Date(`${event.eventDate}T${startTime}`).getTime()
  const end = new Date(`${event.eventDate}T${endTime}`).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null
  }

  if (now < start) {
    return 'upcoming'
  }

  if (now > end) {
    return 'finished'
  }

  return 'inProgress'
}

function getStatusColor(status) {
  const colors = {
    'Joined': 'green',
    'Opening': 'blue',
    'Waitlisted': 'orange',
    'Pending': 'gray',
    'Approved': 'green',
    'In Progress': 'blue',
    'Finished': 'gray',
    'Open': 'blue',
    'Closed': 'gray',
  };
  return colors[status] || 'gray';
}

function CompactEventCard({
  event,
  variant = 'default',
  currentUser = null,
  onEdit = () => {},
  onDelete = () => {},
  onCancel = () => {},
  onParticipate = null,
  onToggleLike = null,
  isCanceling = false,
  isParticipating = false,
  isLikePending = false,
  tourMarker = '',
}) {
  const { languageCode, t } = useI18n()
  const [isLikeLoading, setIsLikeLoading] = useState(false)

  const dateText = formatEventDate(event.eventDate, event.date, languageCode)
  const categoryColor = getCategoryColor(event.category)
  const canToggleLike = Boolean(currentUser?.id) && typeof onToggleLike === 'function'

  async function handleLikeToggle(clickEvent) {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()

    if (!canToggleLike || isLikeLoading || isLikePending) {
      return
    }

    setIsLikeLoading(true)

    try {
      await onToggleLike(event)
    } catch (error) {
      console.error('Could not update event like', error)
    } finally {
      setIsLikeLoading(false)
    }
  }

  async function handleParticipate(clickEvent) {
    clickEvent.preventDefault()
    clickEvent.stopPropagation()

    if (
      typeof onParticipate !== 'function'
      || isParticipating
      || event.isJoined
      || event.isWaitlisted
    ) {
      return
    }

    try {
      await onParticipate(event)
    } catch (error) {
      console.error('Could not participate in event', error)
    }
  }

  // Student variant
  if (variant === 'student') {
    const hasLikesCount = typeof event.likesCount === 'number'
    const isCreator = Boolean(currentUser?.id) && currentUser.id === event.creatorId
    const showParticipationBadge = event.isJoined || event.isWaitlisted
    const canParticipate = Boolean(currentUser?.id) && typeof onParticipate === 'function' && !isCreator
    const actionLabel = isParticipating
      ? t('eventDetails.joining')
      : event.isWaitlisted
        ? t('eventDetails.waitlisted')
        : event.isJoined
          ? t('eventCard.joined')
          : isCreator
            ? t('eventCard.yourEvent')
            : t('eventCard.join')
    const actionClassName = event.isWaitlisted
      ? 'compact-event-card__participation-button compact-event-card__participation-button--waitlisted'
      : event.isJoined
        ? 'compact-event-card__participation-button compact-event-card__participation-button--joined'
        : 'compact-event-card__participation-button'
    const actionDisabled = !canParticipate || isParticipating || event.isJoined || event.isWaitlisted

    return (
      <article className="compact-event-card compact-event-card--student" data-tour={tourMarker || undefined}>
        <div className="compact-event-card__student-layout">
          <Link to={`/events/${event.id}`} className="compact-event-card__student-thumb-link" aria-label={`${t('eventCard.view')}: ${event.title}`}>
            <div className="compact-event-card__student-thumbnail">
              <img
                src={event.image}
                alt={event.title}
                className="compact-event-card__image"
                loading="lazy"
              />
            </div>
          </Link>

          <div className="compact-event-card__student-main">
            <div className="compact-event-card__badges">
              {event.category ? (
                <span className={`compact-event-card__badge compact-event-card__badge--${categoryColor}`}>
                  {event.category}
                </span>
              ) : null}
              {showParticipationBadge ? (
                <span
                  className={
                    event.isWaitlisted
                      ? 'compact-event-card__badge compact-event-card__badge--waitlisted'
                      : 'compact-event-card__badge compact-event-card__badge--joined'
                  }
                >
                  {event.isWaitlisted ? t('eventDetails.waitlisted') : t('eventCard.joined')}
                </span>
              ) : null}
            </div>

            <Link
              to={`/events/${event.id}`}
              className="compact-event-card__student-content-link"
              aria-label={`${t('eventCard.view')}: ${event.title}`}
            >
              <h3 className="compact-event-card__title">{event.title}</h3>
              <div className="compact-event-card__details compact-event-card__details--inline">
                <div className="compact-event-card__detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__icon">
                    <path
                      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{dateText}</span>
                </div>

                <div className="compact-event-card__detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__icon">
                    <path
                      d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 4.86 5.18 10.83 5.4 11.08a1.12 1.12 0 0 0 1.7 0c.22-.25 5.4-6.22 5.4-11.08A6.25 6.25 0 0 0 12 2.75Zm0 8.5A2.25 2.25 0 1 1 12 6.75a2.25 2.25 0 0 1 0 4.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{event.location}</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="compact-event-card__student-actions">
            {hasLikesCount ? (
              canToggleLike ? (
                <button
                  type="button"
                  className={
                    event.isLiked
                      ? 'compact-event-card__like-pill compact-event-card__like-pill--liked'
                      : 'compact-event-card__like-pill'
                  }
                  onClick={handleLikeToggle}
                  disabled={isLikeLoading || isLikePending}
                  aria-pressed={event.isLiked}
                  aria-label={`${event.isLiked ? t('eventDetails.likedAction') : t('eventDetails.likeAction')}: ${event.title}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__heart-icon">
                    <path
                      d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{event.likesCount}</span>
                </button>
              ) : (
                <span className="compact-event-card__like-pill">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__heart-icon">
                    <path
                      d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{event.likesCount}</span>
                </span>
              )
            ) : null}

            <button
              type="button"
              className={actionClassName}
              onClick={handleParticipate}
              disabled={actionDisabled}
            >
              {event.isJoined ? <span className="compact-event-card__checkmark" aria-hidden="true">✓</span> : null}
              <span>{actionLabel}</span>
            </button>
          </div>
        </div>
      </article>
    )
  }

  // Joined variant
  if (variant === 'joined') {
    const participationStatus = event.participationStatus ?? (event.isWaitlisted ? 'waitlisted' : 'joined')
    const isWaitlisted = participationStatus === 'waitlisted'
    const participationDateText = formatTimestampDate(event.joinedAt, dateText, languageCode)
    const statusColor = getStatusColor(isWaitlisted ? 'Waitlisted' : 'Joined')
    const eventLifecycle = getEventLifecycle(event)
    const isEventFinished = eventLifecycle === 'finished'

    return (
      <article className="compact-event-card compact-event-card--joined" data-tour={tourMarker || undefined}>
        <div className="compact-event-card__student-layout">
          <Link to={`/events/${event.id}`} className="compact-event-card__student-thumb-link" aria-label={`${t('eventCard.view')}: ${event.title}`}>
            <div className="compact-event-card__student-thumbnail">
              <img
                src={event.image}
                alt={event.title}
                className="compact-event-card__image"
                loading="lazy"
              />
            </div>
          </Link>

          <div className="compact-event-card__student-main">
            <div className="compact-event-card__badges">
              <span className={`compact-event-card__badge compact-event-card__badge--${statusColor}`}>
                {isWaitlisted ? t('eventDetails.waitlisted') : t('eventDetails.joined')}
              </span>
              <span className="compact-event-card__joined-date">
                {isWaitlisted
                  ? t('joinedEventsPage.waitlistedOn', { date: participationDateText })
                  : t('joinedEventsPage.joinedOn', { date: participationDateText })}
              </span>
            </div>

            <Link
              to={`/events/${event.id}`}
              className="compact-event-card__student-content-link"
              aria-label={`${t('eventCard.view')}: ${event.title}`}
            >
              <h3 className="compact-event-card__title">{event.title}</h3>
              <div className="compact-event-card__details compact-event-card__details--inline">
                <div className="compact-event-card__detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__icon">
                    <path
                      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{dateText}</span>
                </div>
                
                <div className="compact-event-card__detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__icon">
                    <path
                      d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 4.86 5.18 10.83 5.4 11.08a1.12 1.12 0 0 0 1.7 0c.22-.25 5.4-6.22 5.4-11.08A6.25 6.25 0 0 0 12 2.75Zm0 8.5A2.25 2.25 0 1 1 12 6.75a2.25 2.25 0 0 1 0 4.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{event.location}</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="compact-event-card__student-actions compact-event-card__student-actions--icon-row">
            <Link
              to={`/events/${event.id}`}
              className="compact-event-card__action-button compact-event-card__action-button--ghost compact-event-card__action-button--icon-only"
              title={t('eventCard.view')}
              aria-label={`${t('eventCard.view')}: ${event.title}`}
            >
              <IconEye className="compact-event-card__action-icon" />
            </Link>
            {isEventFinished ? (
              <button
                type="button"
                className="compact-event-card__action-button compact-event-card__action-button--danger compact-event-card__action-button--icon-only"
                onClick={() => { onCancel(event); }}
                disabled={isCanceling}
                title={
                  isCanceling
                    ? t('joinedEventsPage.cancelling')
                    : isWaitlisted
                      ? t('joinedEventsPage.leaveWaitlist')
                      : t('joinedEventsPage.cancelParticipation')
                }
                aria-label={
                  isCanceling
                    ? t('joinedEventsPage.cancelling')
                    : isWaitlisted
                      ? `${t('joinedEventsPage.leaveWaitlist')}: ${event.title}`
                      : `${t('joinedEventsPage.cancelParticipation')}: ${event.title}`
                }
              >
                <IconTrash className="compact-event-card__action-icon" />
              </button>
            ) : (
              <button
                type="button"
                className="compact-event-card__action-button compact-event-card__action-button--secondary compact-event-card__action-button--icon-only"
                onClick={() => { onCancel(event); }}
                disabled={isCanceling}
                title={
                  isCanceling
                    ? t('joinedEventsPage.cancelling')
                    : isWaitlisted
                      ? t('joinedEventsPage.leaveWaitlist')
                      : t('joinedEventsPage.cancelParticipation')
                }
                aria-label={
                  isCanceling
                    ? t('joinedEventsPage.cancelling')
                    : isWaitlisted
                      ? `${t('joinedEventsPage.leaveWaitlist')}: ${event.title}`
                      : `${t('joinedEventsPage.cancelParticipation')}: ${event.title}`
                }
              >
                <IconTrash className="compact-event-card__action-icon" />
              </button>
            )}
          </div>
        </div>
      </article>
    )
  }

  // Organizer/Admin variant
  if (variant === 'admin') {
    const moderationStatus = event.moderationStatus ?? 'pending'
    const statusColor = getStatusColor(moderationStatus)

    return (
      <article className="compact-event-card compact-event-card--admin" data-tour={tourMarker || undefined}>
        <div className="compact-event-card__student-layout">
          <Link to={`/events/${event.id}`} className="compact-event-card__student-thumb-link" aria-label={`${t('eventCard.view')}: ${event.title}`}>
            <div className="compact-event-card__student-thumbnail">
              <img
                src={event.image}
                alt={event.title}
                className="compact-event-card__image"
                loading="lazy"
              />
            </div>
          </Link>

          <div className="compact-event-card__student-main">
            <div className="compact-event-card__badges">
              {event.category && (
                <span className={`compact-event-card__badge compact-event-card__badge--${getCategoryColor(event.category)}`}>
                  {getCategoryLabel(event.category)}
                </span>
              )}
              <span className={`compact-event-card__badge compact-event-card__badge--${statusColor}`}>
                {t(`organizerPage.statuses.${moderationStatus}`)}
              </span>
              <span className="compact-event-card__owner-badge">
                {t('eventCard.yourEvent')}
              </span>
            </div>

            <Link
              to={`/events/${event.id}`}
              className="compact-event-card__student-content-link"
              aria-label={`${t('eventCard.view')}: ${event.title}`}
            >
              <h3 className="compact-event-card__title">{event.title}</h3>
              <div className="compact-event-card__details compact-event-card__details--inline">
                <div className="compact-event-card__detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__icon">
                    <path
                      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{dateText}</span>
                </div>
                
                <div className="compact-event-card__detail">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__icon">
                    <path
                      d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 4.86 5.18 10.83 5.4 11.08a1.12 1.12 0 0 0 1.7 0c.22-.25 5.4-6.22 5.4-11.08A6.25 6.25 0 0 0 12 2.75Zm0 8.5A2.25 2.25 0 1 1 12 6.75a2.25 2.25 0 0 1 0 4.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>{event.location}</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="compact-event-card__student-actions compact-event-card__student-actions--icon-row">
            <button
              type="button"
              className="compact-event-card__action-button compact-event-card__action-button--icon-only"
              onClick={(e) => { e.preventDefault(); onEdit(event); }}
              title={t('eventCard.edit')}
              aria-label={`${t('eventCard.edit')}: ${event.title}`}
            >
              <IconPencil className="compact-event-card__action-icon" />
            </button>
            <Link
              to={`/events/${event.id}`}
              className="compact-event-card__action-button compact-event-card__action-button--ghost compact-event-card__action-button--icon-only"
              title={t('eventCard.view')}
              aria-label={`${t('eventCard.view')}: ${event.title}`}
            >
              <IconEye className="compact-event-card__action-icon" />
            </Link>
            <button
              type="button"
              className="compact-event-card__action-button compact-event-card__action-button--danger compact-event-card__action-button--icon-only"
              onClick={(e) => { e.preventDefault(); onDelete(event); }}
              title={t('eventCard.delete')}
              aria-label={`${t('eventCard.delete')}: ${event.title}`}
            >
              <IconTrash className="compact-event-card__action-icon" />
            </button>
          </div>
        </div>
      </article>
    )
  }

  // Default variant
  return (
    <article className="compact-event-card" data-tour={tourMarker || undefined}>
      <Link to={`/events/${event.id}`} className="compact-event-card__link">
        <div className="compact-event-card__content">
          {/* Thumbnail */}
          <div className="compact-event-card__thumbnail">
            <img 
              src={event.image} 
              alt={event.title}
              className="compact-event-card__image"
              loading="lazy"
            />
          </div>

          {/* Main content */}
          <div className="compact-event-card__main">
            {/* Title */}
            <h3 className="compact-event-card__title">{event.title}</h3>

            {/* Badges */}
            <div className="compact-event-card__badges">
              {event.category && (
                <span className={`compact-event-card__badge compact-event-card__badge--${getCategoryColor(event.category)}`}>
                  {getCategoryLabel(event.category)}
                </span>
              )}
              <span className={`compact-event-card__badge compact-event-card__badge--${getStatusColor(event.status)}`}>
                {event.status}
              </span>
            </div>

            {/* Details */}
            <div className="compact-event-card__details">
              <div className="compact-event-card__detail">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__icon">
                  <path
                    d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm12 8H5v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7ZM5 8h14V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1Z"
                    fill="currentColor"
                  />
                </svg>
                <span>{event.date || dateText}</span>
              </div>
              
              <div className="compact-event-card__detail">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="compact-event-card__icon">
                  <path
                    d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 4.86 5.18 10.83 5.4 11.08a1.12 1.12 0 0 0 1.7 0c.22-.25 5.4-6.22 5.4-11.08A6.25 6.25 0 0 0 12 2.75Zm0 8.5A2.25 2.25 0 1 1 12 6.75a2.25 2.25 0 0 1 0 4.5Z"
                    fill="currentColor"
                  />
                </svg>
                <span>{event.location}</span>
              </div>
            </div>

            {/* Footer info */}
            <div className="compact-event-card__footer">
              <div className="compact-event-card__meta">
                <strong>{event.priceLabel || t('common.tbd')}</strong>
                <span>
                  {t('eventDetails.joinedInfo', { count: event.joinedCount ?? 0 })}
                  {event.capacity ? ` / ${event.capacity}` : ''}
                  {event.waitlistCount
                    ? ` | ${t('eventDetails.waitlistInfo', { count: event.waitlistCount })}`
                    : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}

export default CompactEventCard
