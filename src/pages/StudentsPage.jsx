import { useMemo } from 'react'

import EventCard from '../components/EventCard'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/students-events.css'

function getEventStartTimestamp(event) {
  if (!event?.eventDate) {
    return Number.NaN
  }

  const startTime = event.startTime || '00:00'
  const parsedDate = new Date(`${event.eventDate}T${startTime}`)
  return parsedDate.getTime()
}

function StudentsPage({ currentUser, events = [], searchValue = '' }) {
  const { t } = useI18n()

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
    const now = Date.now()
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
  }, [events, t])

  return (
    <section className="students-events-page">
      <div className="students-events-page__intro">
        <p className="students-events-page__eyebrow">
          {t('students.welcome', { name: currentUser?.name ?? t('common.defaultStudent') })}
        </p>
        <h1>{t('students.title')}</h1>
        <p>{t('students.subtitle')}</p>
      </div>

      <div className="students-events-page__summary">
        {summaryCards.map((card) => (
          <article key={card.key} className="students-events-page__summary-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      {filteredEvents.length ? (
        <div className="students-events-grid">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} variant="student" />
          ))}
        </div>
      ) : (
        <div className="students-events-empty">
          <h2>{t('students.emptyTitle')}</h2>
          <p>{t('students.emptyDescription')}</p>
        </div>
      )}
    </section>
  )
}

export default StudentsPage
