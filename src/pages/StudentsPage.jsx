import { useMemo } from 'react'

import EventCard from '../components/EventCard'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/students-events.css'

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

  return (
    <section className="students-events-page">
      <div className="students-events-page__intro">
        <p className="students-events-page__eyebrow">
          {t('students.welcome', { name: currentUser?.name ?? t('common.defaultStudent') })}
        </p>
        <h1>{t('students.title')}</h1>
        <p>{t('students.subtitle')}</p>
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
