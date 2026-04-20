import { useEffect, useMemo, useState } from 'react'

import CompactEventCard from '../components/CompactEventCard'
import PageSEO from '../components/PageSEO'
import { useI18n } from '../i18n/LanguageContext'
import { fetchRecommendedEvents } from '../api/aemApi'
import '../styles/students-events.css'
import '../styles/compact-event-card.css'

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

function StudentsPage({
  currentUser,
  events = [],
  eventsLoading = false,
  searchValue = '',
  onClearSearch = () => {},
  onToggleEventLike = null,
  onParticipateEvent = null,
}) {
  const { t } = useI18n()
  const searchActive = searchValue.trim().length > 0
  const [summaryNow, setSummaryNow] = useState(() => Date.now())
  const [recommendedEventIds, setRecommendedEventIds] = useState([])
  const [recommendedRequestKey, setRecommendedRequestKey] = useState(0)
  const [participatingEventId, setParticipatingEventId] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setSummaryNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!currentUser) {
      return () => {
        isMounted = false
      }
    }

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

    loadRecommended()

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

  async function handleParticipateEvent(event) {
    if (
      typeof onParticipateEvent !== 'function'
      || participatingEventId
      || event.isJoined
      || event.isWaitlisted
    ) {
      return null
    }

    setParticipatingEventId(event.id)

    try {
      const result = await onParticipateEvent(event.id)
      setRecommendedRequestKey((currentKey) => currentKey + 1)
      return result
    } finally {
      setParticipatingEventId('')
    }
  }

  const recommendedRankById = useMemo(() => {
    if (!currentUser) {
      return new Map()
    }

    return new Map(recommendedEventIds.map((eventId, index) => [eventId, index]))
  }, [currentUser, recommendedEventIds])

  const activeEvents = useMemo(() => {
    return events.filter(event => getEventLifecycle(event, summaryNow) !== 'finished')
  }, [events, summaryNow])

  const filteredEvents = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    const baseEvents = query
      ? activeEvents.filter((event) => {
          const haystack = `${event.title} ${event.location} ${event.category}`.toLowerCase()
          return haystack.includes(query)
        })
      : activeEvents

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
    const categories = new Set(
      activeEvents
        .map((event) => event.category)
        .filter(Boolean),
    )

    return [
      {
        key: 'approved',
        label: t('students.summary.approved'),
        value: activeEvents.length,
        tone: 'blue',
      },
      {
        key: 'joined',
        label: t('students.summary.joined'),
        value: activeEvents.filter((event) => event.isJoined).length,
        tone: 'green',
      },
      {
        key: 'upcoming',
        label: t('students.summary.upcoming'),
        value: activeEvents.filter((event) => getEventLifecycle(event, summaryNow) === 'upcoming').length,
        tone: 'violet',
      },
      {
        key: 'categories',
        label: t('students.summary.categories'),
        value: categories.size,
        tone: 'amber',
      },
    ]
  }, [events, summaryNow, t])

  const showSummarySkeleton = eventsLoading && events.length === 0

  return (
    <section className="students-events-page" aria-busy={eventsLoading}>
      <PageSEO
        title={t('students.title')}
        description={t('students.subtitle')}
        path="/students"
      />
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
              <article
                key={card.key}
                className={`students-events-page__summary-card students-events-page__summary-card--${card.tone}`}
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
      </div>

      <div className="students-events-page__catalog" data-tour="students-catalog">
        <p className="students-events-page__catalog-label">{t('common.events')}</p>
        {eventsLoading ? (
          <div className="students-events-grid students-events-grid--skeleton" aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={`card-sk-${index}`} className="students-events-skeleton-card" />
            ))}
          </div>
        ) : filteredEvents.length ? (
          <div className="compact-events-list">
            {filteredEvents.map((event) => (
              <CompactEventCard
                key={event.id}
                event={event}
                variant="student"
                currentUser={currentUser}
                onToggleLike={handleStudentEventLike}
                onParticipate={handleParticipateEvent}
                isParticipating={participatingEventId === event.id}
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
