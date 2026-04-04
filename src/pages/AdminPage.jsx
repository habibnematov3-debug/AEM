import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchAdminEvents, sendAdminReminderBatch, deleteAdminEvents, deleteAdminEvent } from '../api/aemApi'
import { getLanguageLocale } from '../i18n/translations'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/admin.css'

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

function AdminPage({ currentUser, onModerateEvent, onLoadStats }) {
  const { languageCode, t } = useI18n()
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [recentParticipations, setRecentParticipations] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [moderatingEventId, setModeratingEventId] = useState('')
  const [deletingEventId, setDeletingEventId] = useState('')
  const [selectedEventIds, setSelectedEventIds] = useState(new Set())
  const [isSendingReminders, setIsSendingReminders] = useState(false)
  const pendingCount = stats?.pending ?? 0
  const selectedCount = selectedEventIds.size
  const allEventsSelected = events.length > 0 && events.every((event) => selectedEventIds.has(event.id))
  const pendingBadgeLabel = pendingCount > 99 ? '99+' : String(pendingCount)

  useEffect(() => {
    let isMounted = true

    async function loadAdminData() {
      setIsLoading(true)
      setFeedback({ type: '', message: '' })

      try {
        const [dashboardData, adminEvents] = await Promise.all([
          onLoadStats(),
          fetchAdminEvents({
            status: statusFilter === 'all' ? '' : statusFilter,
            query: searchQuery,
          }),
        ])

        if (!isMounted) {
          return
        }

        setStats(dashboardData.stats)
        setRecentEvents(dashboardData.recentEvents)
        setRecentUsers(dashboardData.recentUsers)
        setRecentParticipations(dashboardData.recentParticipations)
        setEvents(adminEvents)
        setSelectedEventIds(new Set())
      } catch (error) {
        if (!isMounted) {
          return
        }

        setFeedback({
          type: 'error',
          message: error.message || t('adminPage.loadError'),
        })
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadAdminData()

    return () => {
      isMounted = false
    }
  }, [onLoadStats, searchQuery, statusFilter, t])

  const statCards = useMemo(
    () =>
      stats
        ? [
            { key: 'users', label: t('adminPage.stats.users'), value: stats.users },
            { key: 'events', label: t('adminPage.stats.events'), value: stats.events },
            { key: 'pending', label: t('adminPage.stats.pending'), value: stats.pending },
            { key: 'approved', label: t('adminPage.stats.approved'), value: stats.approved },
            { key: 'rejected', label: t('adminPage.stats.rejected'), value: stats.rejected },
            { key: 'inProgress', label: t('adminPage.stats.inProgress'), value: stats.inProgress },
            { key: 'finished', label: t('adminPage.stats.finished'), value: stats.finished },
            { key: 'waitlisted', label: t('adminPage.stats.waitlisted'), value: stats.waitlisted },
            { key: 'attended', label: t('adminPage.stats.attended'), value: stats.attended },
            { key: 'noShows', label: t('adminPage.stats.noShows'), value: stats.noShows },
          ]
        : [],
    [stats, t],
  )

  async function handleModeration(eventId, moderationStatus) {
    setModeratingEventId(eventId)
    setFeedback({ type: '', message: '' })

    try {
      const result = await onModerateEvent(eventId, moderationStatus)
      setStats(result.stats)
      setEvents((currentEvents) =>
        currentEvents.map((event) => (event.id === result.event.id ? result.event : event)),
      )
      setSelectedEventIds((currentSelected) => {
        const next = new Set(currentSelected)
        next.delete(eventId)
        return next
      })
      setFeedback({
        type: 'success',
        message:
          moderationStatus === 'approved'
            ? t('adminPage.approveSuccess')
            : t('adminPage.rejectSuccess'),
      })

      if (statusFilter !== 'all' && statusFilter !== moderationStatus) {
        setEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId))
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.moderationError'),
      })
    } finally {
      setModeratingEventId('')
    }
  }

  async function handleDeleteEvent(eventId) {
    if (!window.confirm(t('adminPage.deleteConfirm'))) {
      return
    }

    setDeletingEventId(eventId)
    setFeedback({ type: '', message: '' })

    try {
      const result = await deleteAdminEvent(eventId)
      setStats(result.stats)
      setEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId))
      setFeedback({
        type: 'success',
        message: t('adminPage.deleteSuccess'),
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.deleteError'),
      })
    } finally {
      setDeletingEventId('')
    }
  }

  async function handleSendReminders() {
    setIsSendingReminders(true)
    setFeedback({ type: '', message: '' })

    try {
      const result = await sendAdminReminderBatch({ hoursAhead: 24 })
      setFeedback({
        type: 'success',
        message: result.message || t('adminPage.remindersSuccess', { count: result.sentCount }),
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.remindersError'),
      })
    } finally {
      setIsSendingReminders(false)
    }
  }

  function handleToggleEventSelection(eventId) {
    setSelectedEventIds((currentSelected) => {
      const next = new Set(currentSelected)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  function handleToggleSelectAll() {
    setSelectedEventIds((currentSelected) => {
      if (events.length > 0 && events.every((event) => currentSelected.has(event.id))) {
        return new Set()
      }
      return new Set(events.map((event) => event.id))
    })
  }

  async function handleBulkDelete() {
    if (!selectedCount) {
      return
    }

    if (!window.confirm(t('adminPage.deleteSelectedConfirm', { count: selectedCount }))) {
      return
    }

    setDeletingEventId('bulk')
    setFeedback({ type: '', message: '' })

    try {
      const result = await deleteAdminEvents(Array.from(selectedEventIds))
      setStats(result.stats)
      setEvents((currentEvents) => currentEvents.filter((event) => !selectedEventIds.has(event.id)))
      setSelectedEventIds(new Set())
      setFeedback({
        type: 'success',
        message: t('adminPage.deleteSelectedSuccess', { count: selectedCount }),
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.deleteSelectedError'),
      })
    } finally {
      setDeletingEventId('')
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page__intro" data-tour="admin-intro">
        <div>
          <p className="admin-page__eyebrow">{t('adminPage.eyebrow')}</p>
          <h1>{t('adminPage.title')}</h1>
          <p>{t('adminPage.subtitle', { name: currentUser?.name ?? 'Admin' })}</p>
        </div>

        <div className="admin-page__intro-actions">
          <button
            type="button"
            className="admin-page__manage-users-link admin-page__manage-users-link--button"
            onClick={handleSendReminders}
            disabled={isSendingReminders}
          >
            {isSendingReminders ? t('adminPage.sendingReminders') : t('adminPage.sendReminders')}
          </button>
          <Link
            to="/admin/users"
            className="admin-page__manage-users-link"
            data-tour="admin-manage-users"
          >
            {t('adminPage.manageUsers')}
          </Link>
        </div>
      </div>

      {feedback.message ? (
        <div
          className={
            feedback.type === 'error'
              ? 'admin-page__feedback admin-page__feedback--error'
              : 'admin-page__feedback admin-page__feedback--success'
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="admin-page__stats" data-tour="admin-stats">
        {statCards.map((item) => (
          <article key={item.key} className="admin-page__stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-page__highlights">
        <article className="admin-page__highlight-card">
          <div className="admin-page__highlight-top">
            <h2>{t('adminPage.recentEventsTitle')}</h2>
          </div>
          {recentEvents.length ? (
            <ul className="admin-page__highlight-list">
              {recentEvents.map((event) => (
                <li key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.creatorName}</span>
                  </div>
                  <span>{formatEventDate(event.eventDate, event.date, languageCode)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-page__highlight-empty">{t('adminPage.noRecentEvents')}</p>
          )}
        </article>

        <article className="admin-page__highlight-card">
          <div className="admin-page__highlight-top">
            <h2>{t('adminPage.recentUsersTitle')}</h2>
          </div>
          {recentUsers.length ? (
            <ul className="admin-page__highlight-list">
              {recentUsers.map((user) => (
                <li key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <span>{t(`adminUsersPage.roles.${user.role}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-page__highlight-empty">{t('adminPage.noRecentUsers')}</p>
          )}
        </article>

        <article className="admin-page__highlight-card">
          <div className="admin-page__highlight-top">
            <h2>{t('adminPage.recentActivityTitle')}</h2>
          </div>
          {recentParticipations.length ? (
            <ul className="admin-page__highlight-list">
              {recentParticipations.map((participation) => (
                <li key={participation.id}>
                  <div>
                    <strong>{participation.userName}</strong>
                    <span>{participation.eventTitle}</span>
                  </div>
                  <span>{new Date(participation.joinedAt).toLocaleDateString(getLanguageLocale(languageCode))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-page__highlight-empty">{t('adminPage.noRecentActivity')}</p>
          )}
        </article>
      </div>

      <div className="admin-page__panel">
        <div className="admin-page__panel-top" data-tour="admin-moderation">
          <div>
            <p className="admin-page__panel-eyebrow">{t('adminPage.moderationEyebrow')}</p>
            <div className="admin-page__panel-heading">
              <h2>{t('adminPage.moderationTitle')}</h2>
              {pendingCount > 0 ? (
                <span className="admin-page__pending-pill">
                  {t('adminPage.pendingAlert', { count: pendingBadgeLabel })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="admin-page__controls">
            <label className="admin-page__search">
              <span className="sr-only">{t('common.search')}</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('adminPage.searchPlaceholder')}
              />
            </label>

            <div className="admin-page__filters">
              {['pending', 'approved', 'rejected', 'all'].map((filterValue) => (
                <button
                  key={filterValue}
                  type="button"
                  className={
                    filterValue === statusFilter
                      ? 'admin-page__filter admin-page__filter--active'
                      : 'admin-page__filter'
                  }
                  onClick={() => setStatusFilter(filterValue)}
                >
                  <span>{t(`adminPage.filters.${filterValue}`)}</span>
                  {filterValue === 'pending' && pendingCount > 0 ? (
                    <span className="admin-page__filter-badge">{pendingBadgeLabel}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {events.length ? (
          <div className="admin-page__bulk-actions">
            <label className="admin-page__bulk-select">
              <input
                type="checkbox"
                checked={allEventsSelected}
                onChange={handleToggleSelectAll}
              />
              <span>{t('adminPage.selectAll')}</span>
            </label>

            <button
              type="button"
              className="admin-page__delete-selected-button"
              disabled={selectedCount === 0 || deletingEventId === 'bulk'}
              onClick={handleBulkDelete}
            >
              {deletingEventId === 'bulk'
                ? t('adminPage.deleting')
                : t('adminPage.deleteSelected', { count: selectedCount })}
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="admin-page__empty">
            <h3>{t('adminPage.loadingTitle')}</h3>
            <p>{t('adminPage.loadingDescription')}</p>
          </div>
        ) : events.length ? (
          <div className="admin-page__events">
            {events.map((event) => (
              <article
                key={event.id}
                className={`admin-page__event-card ${selectedEventIds.has(event.id) ? 'admin-page__event-card--selected' : ''}`}
              >
                <div className="admin-page__event-media">
                  <img src={event.image} alt={event.title} />
                </div>

                <div className="admin-page__event-content">
                  <div className="admin-page__event-topline">
                    <label className="admin-page__event-select">
                      <input
                        type="checkbox"
                        checked={selectedEventIds.has(event.id)}
                        onChange={() => handleToggleEventSelection(event.id)}
                      />
                      <span>{t('adminPage.selectEvent')}</span>
                    </label>
                    <span className="admin-page__event-category">{event.category}</span>
                    <span className={`admin-page__event-status admin-page__event-status--${event.moderationStatus}`}>
                      {t(`adminPage.statuses.${event.moderationStatus}`)}
                    </span>
                  </div>

                  <h3>{event.title}</h3>
                  <p className="admin-page__event-description">{event.description}</p>

                  <dl className="admin-page__event-meta">
                    <div>
                      <dt>{t('common.organizer')}</dt>
                      <dd>{event.creatorName}</dd>
                    </div>
                    <div>
                      <dt>{t('common.date')}</dt>
                      <dd>{formatEventDate(event.eventDate, event.date, languageCode)}</dd>
                    </div>
                    <div>
                      <dt>{t('common.location')}</dt>
                      <dd>{event.location}</dd>
                    </div>
                  </dl>

                  <div className="admin-page__event-actions">
                    <Link to={`/events/${event.id}`} className="admin-page__view-button">
                      {t('eventCard.view')}
                    </Link>

                    <button
                      type="button"
                      className="admin-page__approve-button"
                      disabled={
                        moderatingEventId === event.id ||
                        deletingEventId === event.id ||
                        event.moderationStatus === 'approved'
                      }
                      onClick={() => handleModeration(event.id, 'approved')}
                    >
                      {moderatingEventId === event.id
                        ? t('adminPage.moderating')
                        : t('adminPage.approve')}
                    </button>

                    <button
                      type="button"
                      className="admin-page__reject-button"
                      disabled={
                        moderatingEventId === event.id ||
                        deletingEventId === event.id ||
                        event.moderationStatus === 'rejected'
                      }
                      onClick={() => handleModeration(event.id, 'rejected')}
                    >
                      {moderatingEventId === event.id
                        ? t('adminPage.moderating')
                        : t('adminPage.reject')}
                    </button>

                    <button
                      type="button"
                      className="admin-page__delete-button"
                      disabled={moderatingEventId === event.id || deletingEventId === event.id}
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      {deletingEventId === event.id
                        ? t('adminPage.deleting')
                        : t('adminPage.delete')}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-page__empty">
            <h3>{t('adminPage.emptyTitle')}</h3>
            <p>{t('adminPage.emptyDescription')}</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminPage
