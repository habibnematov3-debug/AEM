import { useEffect, useMemo, useState } from 'react'

import { cancelParticipation, fetchMyParticipations } from '../api/aemApi'
import EventCard from '../components/EventCard'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/joined-events.css'

function getEventLifecycle(event) {
  if (!event?.eventDate) {
    return null
  }

  const startTime = event.startTime || '00:00'
  const endTime = event.endTime || startTime
  const start = new Date(`${event.eventDate}T${startTime}`).getTime()
  const end = new Date(`${event.eventDate}T${endTime}`).getTime()
  const now = Date.now()

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

function JoinedEventsPage({ currentUser, searchValue = '' }) {
  const { t } = useI18n()
  const [participations, setParticipations] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [cancelingEventId, setCancelingEventId] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadParticipations() {
      setIsLoading(true)
      setFeedback({ type: '', message: '' })

      try {
        const activeParticipations = await fetchMyParticipations()
        if (!isMounted) {
          return
        }
        setParticipations(activeParticipations)
      } catch (error) {
        if (!isMounted) {
          return
        }
        setFeedback({
          type: 'error',
          message: error.message || t('joinedEventsPage.loadError'),
        })
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadParticipations()

    return () => {
      isMounted = false
    }
  }, [t])

  const summaryCards = useMemo(() => {
    const counts = {
      total: participations.length,
      upcoming: 0,
      inProgress: 0,
      finished: 0,
    }

    participations.forEach((participation) => {
      const lifecycle = getEventLifecycle(participation.event)
      if (lifecycle && lifecycle in counts) {
        counts[lifecycle] += 1
      }
    })

    return [
      { key: 'total', label: t('joinedEventsPage.summary.total'), value: counts.total },
      { key: 'upcoming', label: t('joinedEventsPage.summary.upcoming'), value: counts.upcoming },
      {
        key: 'inProgress',
        label: t('joinedEventsPage.summary.inProgress'),
        value: counts.inProgress,
      },
      { key: 'finished', label: t('joinedEventsPage.summary.finished'), value: counts.finished },
    ]
  }, [participations, t])

  const displayedParticipations = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return participations.filter((participation) => {
      const event = participation.event
      const lifecycle = getEventLifecycle(event)
      const matchesFilter = statusFilter === 'all' || lifecycle === statusFilter

      if (!matchesFilter) {
        return false
      }

      if (!query) {
        return true
      }

      const haystack = `${event.title} ${event.location} ${event.category} ${event.creatorName}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [participations, searchValue, statusFilter])

  async function handleCancelParticipation(event) {
    setCancelingEventId(event.id)
    setFeedback({ type: '', message: '' })

    try {
      const result = await cancelParticipation(event.id)
      setParticipations((currentParticipations) =>
        currentParticipations.filter((participation) => participation.event.id !== event.id),
      )
      setFeedback({
        type: 'success',
        message: result.message || t('joinedEventsPage.cancelSuccess'),
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('joinedEventsPage.cancelError'),
      })
    } finally {
      setCancelingEventId('')
    }
  }

  return (
    <section className="joined-events-page">
      <div className="joined-events-page__intro" data-tour="joined-intro">
        <p className="joined-events-page__eyebrow">
          {t('students.welcome', { name: currentUser?.name ?? t('common.defaultStudent') })}
        </p>
        <h1>{t('joinedEventsPage.title')}</h1>
        <p>{t('joinedEventsPage.subtitle')}</p>
      </div>

      {feedback.message ? (
        <div
          className={
            feedback.type === 'error'
              ? 'joined-events-page__feedback joined-events-page__feedback--error'
              : 'joined-events-page__feedback joined-events-page__feedback--success'
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="joined-events-page__summary">
        {summaryCards.map((card) => (
          <article key={card.key} className="joined-events-page__summary-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="joined-events-page__filters">
        {['all', 'upcoming', 'inProgress', 'finished'].map((filterValue) => (
          <button
            key={filterValue}
            type="button"
            className={
              filterValue === statusFilter
                ? 'joined-events-page__filter joined-events-page__filter--active'
                : 'joined-events-page__filter'
            }
            onClick={() => setStatusFilter(filterValue)}
          >
            {t(`joinedEventsPage.filters.${filterValue}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="joined-events-page__empty">
          <h2>{t('joinedEventsPage.loadingTitle')}</h2>
          <p>{t('joinedEventsPage.loadingDescription')}</p>
        </div>
      ) : displayedParticipations.length ? (
        <div className="joined-events-grid">
          {displayedParticipations.map((participation) => (
            <EventCard
              key={participation.id}
              event={{
                ...participation.event,
                participationStatus: participation.status,
                joinedAt: participation.joinedAt,
                checkedInAt: participation.checkedInAt,
              }}
              variant="joined"
              onCancel={handleCancelParticipation}
              isCanceling={cancelingEventId === participation.event.id}
              tourMarker={displayedParticipations[0]?.id === participation.id ? 'joined-first-card' : ''}
            />
          ))}
        </div>
      ) : (
        <div className="joined-events-page__empty">
          <h2>{t('joinedEventsPage.emptyTitle')}</h2>
          <p>{t('joinedEventsPage.emptyDescription')}</p>
        </div>
      )}
    </section>
  )
}

export default JoinedEventsPage
