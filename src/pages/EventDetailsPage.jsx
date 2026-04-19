import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useI18n } from '../i18n/LanguageContext'
import { getLanguageLocale } from '../i18n/translations'
import {
  cancelParticipation,
  checkInParticipant,
  fetchEventById,
  fetchEventParticipants,
  participateInEvent,
} from '../api/aemApi'
import { getCategoryLabel } from '../constants/eventCategories'
import EventCheckInPass from '../components/EventCheckInPass'
import '../styles/event-details.css'

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

function formatModerationStatus(status, languageCode) {
  const normalized = String(status ?? 'pending').toLowerCase()
  if (languageCode === 'ru') {
    return { pending: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено' }[normalized] ?? normalized
  }

  if (languageCode === 'uz') {
    return { pending: 'Tekshiruvda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' }[normalized] ?? normalized
  }

  return { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[normalized] ?? normalized
}

function EventDetailsPage({ currentUser, onToggleEventLike = null }) {
  const { languageCode, t } = useI18n()
  const navigate = useNavigate()
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' })
  const [isJoining, setIsJoining] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const [checkInLoading, setCheckInLoading] = useState({})
  const [participants, setParticipants] = useState([])
  const [participantsStatus, setParticipantsStatus] = useState('idle')
  const [participantsError, setParticipantsError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadEvent() {
      console.log('Loading event with ID:', eventId)
      setStatus('loading')
      setErrorMessage('')

      try {
        const fetchedEvent = await fetchEventById(eventId)
        console.log('Fetched event:', fetchedEvent)
        
        if (!isMounted) {
          return
        }

        setEvent(fetchedEvent)
        setStatus('ready')
      } catch (error) {
        if (!isMounted) {
          return
        }

        console.error('EventDetailsPage Error:', error)
        console.error('Error status:', error.status)
        console.error('Error message:', error.message)

        setEvent(null)
        if (error.status === 404) {
          setStatus('not-found')
          return
        }

        setErrorMessage(error.message || error.detail || t('eventDetails.errorTitle'))
        setStatus('error')
      }
    }

    loadEvent()

    return () => {
      isMounted = false
    }
  }, [eventId])

  useEffect(() => {
    let isMounted = true

    async function loadParticipants() {
      if (!event || !currentUser?.id) {
        setParticipants([])
        setParticipantsStatus('idle')
        setParticipantsError('')
        return
      }

      const canViewParticipants = currentUser.role === 'admin' || currentUser.id === event.creatorId
      if (!canViewParticipants) {
        setParticipants([])
        setParticipantsStatus('idle')
        setParticipantsError('')
        return
      }

      setParticipantsStatus('loading')
      setParticipantsError('')

      try {
        const payload = await fetchEventParticipants(event.id)
        if (!isMounted) {
          return
        }
        setParticipants(payload.participants)
        setParticipantsStatus('ready')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setParticipants([])
        setParticipantsStatus('error')
        setParticipantsError(error.message || t('eventDetails.participantsLoadError'))
      }
    }

    loadParticipants()

    return () => {
      isMounted = false
    }
  }, [currentUser, event, t])

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/students')
  }

  async function handleParticipate() {
    if (!event || !currentUser || isJoining || event.isJoined || event.isWaitlisted) {
      return
    }

    setIsJoining(true)
    setActionFeedback({ type: '', message: '' })

    try {
      const result = await participateInEvent(event.id)
      setEvent(result.event)
      setActionFeedback({
        type: 'success',
        message: result.message || t('eventDetails.joined'),
      })
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: error.message || t('eventDetails.joinError'),
      })
    } finally {
      setIsJoining(false)
    }
  }

  async function handleCancelParticipation() {
    if (!event || !currentUser || isCanceling || (!event.isJoined && !event.isWaitlisted)) {
      return
    }

    setIsCanceling(true)
    setActionFeedback({ type: '', message: '' })

    try {
      const result = await cancelParticipation(event.id)
      setEvent(result.event)
      setActionFeedback({
        type: 'success',
        message: result.message || t('eventDetails.cancelled'),
      })
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: error.message || t('eventDetails.cancelError'),
      })
    } finally {
      setIsCanceling(false)
    }
  }

  async function handleCheckIn(participantId) {
    if (!event || !currentUser || !participantId || checkInLoading[participantId]) {
      return
    }

    setCheckInLoading((current) => ({ ...current, [participantId]: true }))
    setActionFeedback({ type: '', message: '' })

    try {
      const result = await checkInParticipant(event.id, participantId)
      if (result.event) {
        setEvent(result.event)
      }
      setParticipants((current) =>
        current.map((participant) =>
          participant.id === String(participantId)
            ? { ...participant, checkedInAt: result.participation?.checked_in_at ?? participant.checkedInAt }
            : participant,
        ),
      )
      setActionFeedback({ type: 'success', message: t('eventDetails.checkInSuccess') })
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: error.message || t('eventDetails.checkInError'),
      })
    } finally {
      setCheckInLoading((current) => ({ ...current, [participantId]: false }))
    }
  }

  async function handleToggleLike() {
    if (!event || !currentUser || !onToggleEventLike || isTogglingLike) {
      return
    }

    setIsTogglingLike(true)
    setActionFeedback({ type: '', message: '' })

    try {
      const result = await onToggleEventLike(event)
      setEvent(result.event)
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: error.message || t('eventDetails.likeError'),
      })
    } finally {
      setIsTogglingLike(false)
    }
  }

  if (status === 'loading') {
    return (
      <section className="event-details-page">
        <div className="event-details-empty event-details-empty--info">
          <button type="button" className="event-details-back" onClick={handleBack}>
            {t('eventDetails.backToEvents')}
          </button>
          <h1>{t('eventDetails.loadingTitle')}</h1>
          <p>{t('eventDetails.loadingDescription')}</p>
        </div>
      </section>
    )
  }

  if (status === 'not-found') {
    return (
      <section className="event-details-page">
        <div className="event-details-empty">
          <button type="button" className="event-details-back" onClick={handleBack}>
            {t('eventDetails.backToEvents')}
          </button>
          <h1>{t('eventDetails.notFoundTitle')}</h1>
          <p>{t('eventDetails.notFoundDescription')}</p>
        </div>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="event-details-page">
        <div className="event-details-empty event-details-empty--error">
          <button type="button" className="event-details-back" onClick={handleBack}>
            {t('eventDetails.backToEvents')}
          </button>
          <h1>{t('eventDetails.errorTitle')}</h1>
          <p>{errorMessage}</p>
        </div>
      </section>
    )
  }

  const isCreator = Boolean(currentUser?.id) && currentUser.id === event.creatorId
  const isPubliclyAvailable = event.moderationStatus === 'approved'
  const canParticipate = Boolean(currentUser?.id) && !isCreator && isPubliclyAvailable
  const canLike = Boolean(currentUser?.id) && isPubliclyAvailable && onToggleEventLike
  const hasJoined = Boolean(event.isJoined)
  const isWaitlisted = Boolean(event.isWaitlisted)
  const hasActiveParticipation = hasJoined || isWaitlisted
  const dateText = formatEventDate(event.eventDate, event.date, languageCode)
  const categoryText = getCategoryLabel(event.category)
  const organizerText = event.creatorName || event.organizerName || t('common.unknownOrganizer')
  const statusText = formatModerationStatus(event.moderationStatus, languageCode)
  const canViewParticipants = Boolean(currentUser?.id) && (isCreator || currentUser.role === 'admin')

  return (
    <section className="event-details-page">
      <button type="button" className="event-details-back" onClick={handleBack}>
        {t('eventDetails.backToEvents')}
      </button>

      <article className="event-details-card">
        <img className="event-details-cover" src={event.image} alt={event.title} />

        <div className="event-details-content">
          <div className="event-details-topline">
            <span className="event-details-badge">{categoryText}</span>
            <span className="event-details-status">{statusText}</span>
          </div>

          <div className="event-details-social">
            <span className={event.isLiked ? 'event-details-likes event-details-likes--liked' : 'event-details-likes'}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"
                  fill="currentColor"
                />
              </svg>
              <span>{t('eventDetails.likesCount', { count: event.likesCount })}</span>
            </span>

            {canLike ? (
              <button
                type="button"
                className={event.isLiked ? 'event-details-like-button event-details-like-button--active' : 'event-details-like-button'}
                onClick={handleToggleLike}
                disabled={isTogglingLike}
              >
                {isTogglingLike
                  ? t('eventDetails.updatingLike')
                  : event.isLiked
                    ? t('eventDetails.likedAction')
                    : t('eventDetails.likeAction')}
              </button>
            ) : null}
          </div>

          <h1>{event.title}</h1>

          <div className="event-details-stats">
            <span>
              {t('eventDetails.joinedInfo', { count: event.joinedCount ?? 0 })}
            </span>
            {event.capacity ? (
              <span>{t('eventDetails.capacityInfo', { count: event.capacity })}</span>
            ) : null}
            {event.waitlistCount ? (
              <span>{t('eventDetails.waitlistInfo', { count: event.waitlistCount })}</span>
            ) : null}
            {event.checkedInCount ? (
              <span>{t('eventDetails.checkedInInfo', { count: event.checkedInCount })}</span>
            ) : null}
            {event.noShowCount ? (
              <span>{t('eventDetails.noShowInfo', { count: event.noShowCount })}</span>
            ) : null}
          </div>

          <p className="event-details-description">{event.description}</p>

          <div className="event-details-actions">
            {canParticipate ? (
              hasActiveParticipation ? (
                <div className="event-details-action-group">
                  <button type="button" className="event-details-primary" disabled>
                    {hasJoined ? t('eventDetails.joined') : t('eventDetails.waitlisted')}
                  </button>
                  <button
                    type="button"
                    className="event-details-secondary"
                    onClick={handleCancelParticipation}
                    disabled={isCanceling}
                  >
                    {isCanceling
                      ? t('eventDetails.cancellingParticipation')
                      : t('eventDetails.cancelParticipation')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="event-details-primary"
                  onClick={handleParticipate}
                  disabled={isJoining}
                >
                  {isJoining ? t('eventDetails.joining') : t('eventDetails.participate')}
                </button>
              )
            ) : isCreator ? (
              <p className="event-details-inline-note">{t('eventDetails.creatorNote')}</p>
            ) : currentUser?.id && !isPubliclyAvailable ? (
              <p className="event-details-inline-note">{t('eventDetails.pendingJoinNote')}</p>
            ) : (
              <p className="event-details-inline-note">{t('eventDetails.signInToJoin')}</p>
            )}

            {canParticipate && isWaitlisted ? (
              <p className="event-details-inline-note">
                {event.waitlistPosition
                  ? t('eventDetails.waitlistPositionInfo', { count: event.waitlistPosition })
                  : t('eventDetails.waitlistedNote')}
              </p>
            ) : null}

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

          {hasJoined && !isCreator ? <EventCheckInPass eventId={event.id} /> : null}

          <div className="event-details-grid">
            <div className="event-details-item">
              <span>{t('common.date')}</span>
              <strong>{dateText}</strong>
            </div>
            <div className="event-details-item">
              <span>{t('common.startTime')}</span>
              <strong>{event.startTime || t('common.tbd')}</strong>
            </div>
            <div className="event-details-item">
              <span>{t('common.endTime')}</span>
              <strong>{event.endTime || t('common.tbd')}</strong>
            </div>
            <div className="event-details-item">
              <span>{t('common.location')}</span>
              <strong>{event.location}</strong>
            </div>
            <div className="event-details-item">
              <span>{t('common.category')}</span>
              <strong>{categoryText}</strong>
            </div>
            <div className="event-details-item">
              <span>{t('common.organizer')}</span>
              <strong>{organizerText}</strong>
            </div>
          </div>

          {canViewParticipants ? (
            <section className="event-details-participants">
              <div className="event-details-participants__top">
                <div>
                  <h2>{t('eventDetails.participantsTitle')}</h2>
                  <p>{t('eventDetails.participantsSubtitle')}</p>
                </div>
                <div className="event-details-participants__tools">
                  <Link
                    to={`/events/${event.id}/check-in`}
                    className="event-details-participants__scan"
                  >
                    {t('eventDetails.openScanner')}
                  </Link>
                  <span className="event-details-participants__count">{participants.length}</span>
                </div>
              </div>

              {participantsStatus === 'loading' ? (
                <p className="event-details-participants__empty">
                  {t('eventDetails.loadingParticipants')}
                </p>
              ) : participantsStatus === 'error' ? (
                <p className="event-details-participants__empty event-details-feedback--error">
                  {participantsError || t('eventDetails.participantsLoadError')}
                </p>
              ) : participants.length ? (
                <div className="event-details-participants__list">
                  {participants.map((participant) => (
                    <article key={participant.id} className="event-details-participant">
                      <div className="event-details-participant__identity">
                        {participant.profileImageUrl ? (
                          <img
                            src={participant.profileImageUrl}
                            alt={participant.userName}
                            className="event-details-participant__image"
                          />
                        ) : (
                          <span className="event-details-participant__avatar">
                            {participant.userName.trim().charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}

                        <div>
                          <strong>{participant.userName}</strong>
                          <span>{participant.email}</span>
                        </div>
                      </div>

                      <span className="event-details-participant__joined">
                        {new Date(participant.joinedAt).toLocaleDateString(getLanguageLocale(languageCode))}
                      </span>

                      <div className="event-details-participant__status-actions">
                        {participant.status === 'joined' && !participant.checkedInAt ? (
                          <button
                            type="button"
                            className="event-details-participant__checkin"
                            onClick={() => handleCheckIn(participant.id)}
                            disabled={Boolean(checkInLoading[participant.id])}
                          >
                            {checkInLoading[participant.id]
                              ? t('eventDetails.checkingIn')
                              : t('eventDetails.checkIn')}
                          </button>
                        ) : participant.status === 'joined' && participant.checkedInAt ? (
                          <span className="event-details-participant__checked-in">
                            {t('eventDetails.checkedIn')}
                          </span>
                        ) : participant.status === 'waitlisted' ? (
                          <span className="event-details-participant__waitlist">
                            {t('eventDetails.waitlisted')}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="event-details-participants__empty">{t('eventDetails.noParticipants')}</p>
              )}
            </section>
          ) : null}
        </div>
      </article>
    </section>
  )
}

export default EventDetailsPage
