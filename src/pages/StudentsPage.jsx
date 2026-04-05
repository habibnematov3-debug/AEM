import { useEffect, useMemo, useState } from 'react'

import EventCard from '../components/EventCard'
import { useI18n } from '../i18n/LanguageContext'
import { fetchRecommendedEvents } from '../api/aemApi'
import '../styles/students-events.css'

function getEventStartTimestamp(event) {
  if (!event?.eventDate) {
    return Number.NaN
  }

  const startTime = event.startTime || '00:00'
  const parsedDate = new Date(`${event.eventDate}T${startTime}`)
  return parsedDate.getTime()
}

function StudentsPage({
  currentUser,
  events = [],
  eventsLoading = false,
  searchValue = '',
  onClearSearch = () => {},
  onToggleEventLike = null,
}) {
  const { t } = useI18n()
  const searchActive = searchValue.trim().length > 0
  const [summaryNow, setSummaryNow] = useState(() => Date.now())
  const [recommendedEvents, setRecommendedEvents] = useState([])
  const [recommendedLoading, setRecommendedLoading] = useState(false)
  const [recommendedError, setRecommendedError] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setSummaryNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadRecommended() {
      setRecommendedLoading(true)
      setRecommendedError('')

      try {
        const fetched = await fetchRecommendedEvents()
        if (!isMounted) {
          return
        }
        setRecommendedEvents(fetched)
      } catch (error) {
        if (!isMounted) {
          return
        }
        console.error('Failed to load recommended events:', error)
        setRecommendedEvents([])
        setRecommendedError(error.message || t('students.recommendationsLoadError'))
      } finally {
        if (isMounted) {
          setRecommendedLoading(false)
        }
      }
    }

    if (currentUser) {
      loadRecommended()
    } else {
      setRecommendedEvents([])
      setRecommendedError('')
      setRecommendedLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [currentUser, t])

  async function handleRecommendedLike(event) {
    if (typeof onToggleEventLike !== 'function') {
      return null
    }

    const result = await onToggleEventLike(event)
    if (result?.event) {
      setRecommendedEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === result.event.id ? result.event : currentEvent,
        ),
      )
    }
    return result
  }

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

  const summaryCards = useMemo(() => {
    const now = summaryNow
    const categories = new Set(
      events
        .map((event) => event.category)
        .filter(Boolean),
    )

    return [
      {
        key: 'approved',
        label: t('students.summary.approved'),
        value: events.length,
      },
      {
        key: 'joined',
        label: t('students.summary.joined'),
        value: events.filter((event) => event.isJoined).length,
      },
      {
        key: 'upcoming',
        label: t('students.summary.upcoming'),
        value: events.filter((event) => {
          const eventTime = getEventStartTimestamp(event)
          return Number.isFinite(eventTime) && eventTime >= now
        }).length,
      },
      {
        key: 'categories',
        label: t('students.summary.categories'),
        value: categories.size,
      },
    ]
  }, [events, summaryNow, t])

  const showSummarySkeleton = eventsLoading && events.length === 0

  return (
    <section className="students-events-page" aria-busy={eventsLoading}>
      <div className="students-events-page__intro" data-tour="students-intro">
        <p className="students-events-page__eyebrow">
          {t('students.welcome', { name: currentUser?.name ?? t('common.defaultStudent') })}
        </p>
        <h1>{t('students.title')}</h1>
        <p>{t('students.subtitle')}</p>
      </div>

      <div className="students-events-page__summary">
        {showSummarySkeleton
          ? Array.from({ length: 4 }, (_, index) => (
              <div
                key={`sk-${index}`}
                className="students-events-page__summary-card students-events-page__summary-card--skeleton"
                aria-hidden
              />
            ))
          : summaryCards.map((card) => (
              <article key={card.key} className="students-events-page__summary-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
      </div>

      <div className="students-events-page__recommendations">
        <h2>{t('students.recommendationsTitle')}</h2>
        {recommendedLoading ? (
          <div className="students-events-grid students-events-grid--skeleton" aria-hidden>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={`rec-sk-${index}`} className="students-events-skeleton-card" />
            ))}
          </div>
        ) : recommendedEvents.length > 0 ? (
          <div className="students-events-grid">
            {recommendedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                variant="student"
                currentUser={currentUser}
                onToggleLike={handleRecommendedLike}
              />
            ))}
          </div>
        ) : recommendedError ? (
          <div
            className="students-events-page__recommendations-state students-events-page__recommendations-state--error"
            role="alert"
          >
            {recommendedError}
          </div>
        ) : (
          <div className="students-events-page__recommendations-state" aria-live="polite">
            {t('students.noRecommendations')}
          </div>
        )}
      </div>

      <div data-tour="students-catalog">
        {eventsLoading ? (
          <div className="students-events-grid students-events-grid--skeleton" aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={`card-sk-${index}`} className="students-events-skeleton-card" />
            ))}
          </div>
        ) : filteredEvents.length ? (
          <div className="students-events-grid">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              variant="student"
              currentUser={currentUser}
              onToggleLike={onToggleEventLike}
              tourMarker={filteredEvents[0]?.id === event.id ? 'students-first-card' : ''}
            />
          ))}
          </div>
        ) : events.length === 0 ? (
          <div className="students-events-empty">
            <h2>{t('students.emptyNoEventsTitle')}</h2>
            <p>{t('students.emptyNoEventsDescription')}</p>
          </div>
        ) : (
          <div className="students-events-empty">
            <h2>{t('students.emptyFilterTitle')}</h2>
            <p>{t('students.emptyFilterDescription')}</p>
            {searchActive ? (
              <button type="button" className="students-events-empty__action" onClick={onClearSearch}>
                {t('students.clearSearch')}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}

export default StudentsPage
