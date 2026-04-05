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
  const [recommendedEventIds, setRecommendedEventIds] = useState([])
  const [recommendedRequestKey, setRecommendedRequestKey] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setSummaryNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadRecommended() {
      try {
        const fetched = await fetchRecommendedEvents()
        if (!isMounted) {
          return
        }
        setRecommendedEventIds(fetched.map((event) => event.id))
      } catch (error) {
        if (!isMounted) {
          return
        }
        console.error('Failed to load recommended events:', error)
        setRecommendedEventIds([])
      }
    }

    if (currentUser) {
      loadRecommended()
    } else {
      setRecommendedEventIds([])
    }

    return () => {
      isMounted = false
    }
  }, [currentUser, recommendedRequestKey])

  async function handleStudentEventLike(event) {
    if (typeof onToggleEventLike !== 'function') {
      return null
    }

    const result = await onToggleEventLike(event)
    setRecommendedRequestKey((currentKey) => currentKey + 1)
    return result
  }

  const recommendedRankById = useMemo(
    () => new Map(recommendedEventIds.map((eventId, index) => [eventId, index])),
    [recommendedEventIds],
  )

  const filteredEvents = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    const baseEvents = query
      ? events.filter((event) => {
          const haystack = `${event.title} ${event.location} ${event.category}`.toLowerCase()
          return haystack.includes(query)
        })
      : events

    return baseEvents
      .map((event, index) => ({
        event,
        index,
        recommendedRank: recommendedRankById.get(event.id) ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((left, right) => {
        if (left.recommendedRank !== right.recommendedRank) {
          return left.recommendedRank - right.recommendedRank
        }
        return left.index - right.index
      })
      .map(({ event }) => event)
  }, [events, recommendedRankById, searchValue])

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
                onToggleLike={handleStudentEventLike}
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
