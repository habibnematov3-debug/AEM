import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  cancelParticipation,
  fetchEventById,
  fetchEventParticipants,
  participateInEvent,
} from '../api/aemApi'
import { getLanguageLocale } from '../i18n/translations'
import { useI18n } from '../i18n/LanguageContext'
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

function EventDetailsPage({ currentUser }) {
  const { languageCode, t } = useI18n()
  const navigate = useNavigate()
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' })
  const [isJoining, setIsJoining] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [participants, setParticipants] = useState([])
  const [participantsStatus, setParticipantsStatus] = useState('idle')
  const [participantsError, setParticipantsError] = useState('')

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
    if (!event || !currentUser || isJoining || event.isJoined) {
      return
    }

    setIsJoining(true)
    setActionFeedback({ type: '', message: '' })

    try {
      const result = await participateInEvent(event.id)
      setEvent(result.event)
      setActionFeedback({ type: 'success', message: t('eventDetails.joined') })
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: error.message || 'Could not join this event.',
      })
    } finally {
      setIsJoining(false)
    }
  }

  async function handleCancelParticipation() {
    if (!event || !currentUser || isCanceling || !event.isJoined) {
      return
    }

    setIsCanceling(true)
    setActionFeedback({ type: '', message: '' })

    try {
      const result = await cancelParticipation(event.id)
      setEvent(result.event)
      setActionFeedback({ type: 'success', message: t('eventDetails.cancelled') })
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: error.message || t('eventDetails.cancelError'),
      })
    } finally {
      setIsCanceling(false)
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
  const hasJoined = Boolean(event.isJoined)
  const dateText = formatEventDate(event.eventDate, event.date, languageCode)
  const categoryText = event.category || t('common.general')
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

          <h1>{event.title}</h1>
          <p className="event-details-description">{event.description}</p>

          <div className="event-details-actions">
            {canParticipate ? (
              hasJoined ? (
                <div className="event-details-action-group">
                  <button type="button" className="event-details-primary" disabled>
                    {t('eventDetails.joined')}
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
                <span className="event-details-participants__count">{participants.length}</span>
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
