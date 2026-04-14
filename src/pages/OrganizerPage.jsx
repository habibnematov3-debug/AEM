import { useMemo, useState } from 'react'

import CreateEventForm from '../components/CreateEventForm'
import CompactEventCard from '../components/CompactEventCard'
import { useI18n } from '../i18n/LanguageContext'
import Modal from '../components/Modal'
import '../styles/organizer-events.css'
import '../styles/compact-event-card.css'

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

function OrganizerPage({
  currentUser,
  events = [],
  eventsLoading = false,
  searchValue = '',
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onClearSearch = () => {},
}) {
  const { t } = useI18n()
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventPendingDelete, setEventPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formFeedback, setFormFeedback] = useState({ type: '', message: '' })

  const ownedEvents = useMemo(
    () => events.filter((event) => event.creatorId === currentUser?.id),
    [currentUser, events],
  )

  const userEvents = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    if (!query) {
      return ownedEvents
    }

    return ownedEvents.filter((event) => {
      const haystack = `${event.title} ${event.location} ${event.category}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [ownedEvents, searchValue])

  const hasAccountEvents = ownedEvents.length > 0
  const searchActive = searchValue.trim().length > 0
  const summaryCards = useMemo(() => {
    const counts = {
      pending: ownedEvents.filter((event) => event.moderationStatus === 'pending').length,
      approved: ownedEvents.filter((event) => event.moderationStatus === 'approved').length,
      rejected: ownedEvents.filter((event) => event.moderationStatus === 'rejected').length,
      upcoming: 0,
      inProgress: 0,
      finished: 0,
    }

    ownedEvents.forEach((event) => {
      const lifecycle = getEventLifecycle(event)
      if (lifecycle && lifecycle in counts) {
        counts[lifecycle] += 1
      }
    })

    return [
      { key: 'pending', label: t('organizerPage.summary.pending'), value: counts.pending },
      { key: 'approved', label: t('organizerPage.summary.approved'), value: counts.approved },
      { key: 'rejected', label: t('organizerPage.summary.rejected'), value: counts.rejected },
      { key: 'upcoming', label: t('organizerPage.summary.upcoming'), value: counts.upcoming },
      {
        key: 'inProgress',
        label: t('organizerPage.summary.inProgress'),
        value: counts.inProgress,
      },
      { key: 'finished', label: t('organizerPage.summary.finished'), value: counts.finished },
    ]
  }, [ownedEvents, t])

  async function handleCreate(formData) {
    try {
      const createdEvent = await onCreateEvent(formData)
      setFormFeedback({ type: 'success', message: t('organizerPage.createdSuccess') })
      setEditingEvent(null)
      setIsCreateFormOpen(false)
      return createdEvent
    } catch (error) {
      setFormFeedback({
        type: 'error',
        message: error.message || t('organizerPage.createError'),
      })
      throw error
    }
  }

  function handleEdit(event) {
    setFormFeedback({ type: '', message: '' })
    setEventPendingDelete(null)
    setIsCreateFormOpen(false)
    setEditingEvent(event)
  }

  async function handleUpdate(formData) {
    if (!editingEvent) {
      return
    }

    try {
      const updatedEvent = await onUpdateEvent(editingEvent.id, formData)
      setFormFeedback({ type: 'success', message: t('organizerPage.updatedSuccess') })
      setEditingEvent(null)
      setIsCreateFormOpen(false)
      return updatedEvent
    } catch (error) {
      setFormFeedback({
        type: 'error',
        message: error.message || t('organizerPage.updateError'),
      })
      throw error
    }
  }

  function handleCancelForm() {
    setFormFeedback({ type: '', message: '' })
    setEditingEvent(null)
    setIsCreateFormOpen(false)
  }

  function handleRequestDelete(event) {
    setFormFeedback({ type: '', message: '' })
    setEditingEvent(null)
    setIsCreateFormOpen(false)
    setEventPendingDelete(event)
  }

  function handleCancelDelete() {
    if (isDeleting) {
      return
    }
    setEventPendingDelete(null)
  }

  async function handleConfirmDelete() {
    if (!eventPendingDelete) {
      return
    }

    setIsDeleting(true)

    try {
      await onDeleteEvent(eventPendingDelete.id)
      setFormFeedback({ type: 'success', message: t('organizerPage.deletedSuccess') })
      setEventPendingDelete(null)
    } catch (error) {
      setFormFeedback({
        type: 'error',
        message: error.message || t('organizerPage.deleteError'),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="organizer-events-page">
      <div className="organizer-events-page__topbar">
        <div className="organizer-events-page__intro" data-tour="organizer-intro">
          <p className="organizer-events-page__eyebrow">{t('organizerPage.eyebrow')}</p>
          <h1>{t('organizerPage.title')}</h1>
          <p>{t('organizerPage.subtitle')}</p>
          <p className="organizer-events-page__note">{t('organizerPage.reviewSummary')}</p>
        </div>

        <button
          type="button"
          className="organizer-events-page__create-button"
          data-tour="organizer-create-event"
          onClick={() => {
            setFormFeedback({ type: '', message: '' })
            setEditingEvent(null)
            setEventPendingDelete(null)
            setIsCreateFormOpen(true)
          }}
        >
          {t('organizerPage.createEvent')}
        </button>
      </div>

      {formFeedback.message ? (
        <div
          className={
            formFeedback.type === 'error'
              ? 'organizer-events-page__feedback organizer-events-page__feedback--error'
              : 'organizer-events-page__feedback organizer-events-page__feedback--success'
          }
        >
          {formFeedback.message}
        </div>
      ) : null}

      <div className="organizer-events-page__status-summary">
        {eventsLoading && ownedEvents.length === 0
          ? Array.from({ length: 6 }, (_, index) => (
              <div
                key={`osk-${index}`}
                className="organizer-events-page__status-card organizer-events-page__status-card--skeleton"
                aria-hidden
              />
            ))
          : summaryCards.map((card) => (
              <article key={card.key} className="organizer-events-page__status-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
      </div>

      {isCreateFormOpen ? (
        <CreateEventForm
          mode="create"
          initialValues={null}
          currentUserId={currentUser?.id}
          onCancel={handleCancelForm}
          onSubmit={handleCreate}
        />
      ) : null}

      {editingEvent ? (
        <Modal size="lg" onClose={handleCancelForm} labelledBy="edit-event-title">
          <CreateEventForm
            mode="edit"
            initialValues={editingEvent}
            currentUserId={currentUser?.id}
            onCancel={handleCancelForm}
            onSubmit={handleUpdate}
            titleId="edit-event-title"
          />
        </Modal>
      ) : null}

      {eventsLoading ? (
        <div className="organizer-events-grid organizer-events-grid--skeleton" aria-hidden>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={`og-sk-${index}`} className="organizer-events-skeleton-card" />
          ))}
        </div>
      ) : userEvents.length ? (
        <div className="compact-events-list">
          {userEvents.map((event) => (
            <CompactEventCard
              key={event.id}
              event={event}
              variant="admin"
              onEdit={handleEdit}
              onDelete={handleRequestDelete}
            />
          ))}
        </div>
      ) : (
        <div className="organizer-events-empty">
          <h2>
            {hasAccountEvents ? t('organizerPage.noResultsTitle') : t('organizerPage.noEventsTitle')}
          </h2>
          <p>
            {hasAccountEvents
              ? t('organizerPage.noResultsDescription')
              : t('organizerPage.noEventsDescription')}
          </p>
          {hasAccountEvents && searchActive ? (
            <button type="button" className="organizer-events-empty__action" onClick={onClearSearch}>
              {t('students.clearSearch')}
            </button>
          ) : null}
        </div>
      )}

      {eventPendingDelete ? (
        <Modal onClose={handleCancelDelete} labelledBy="delete-event-title">
          <div className="organizer-events-dialog">
            <div className="organizer-events-dialog__copy">
              <p className="organizer-events-dialog__eyebrow">{t('organizerPage.deleteEyebrow')}</p>
              <h2 id="delete-event-title">{t('organizerPage.deleteTitle')}</h2>
              <p>{t('organizerPage.deleteDescription', { title: eventPendingDelete.title })}</p>
            </div>

            <div className="organizer-events-dialog__actions">
              <button
                type="button"
                className="create-event-form__secondary"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="organizer-events-dialog__delete-button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? t('organizerPage.deleting') : t('organizerPage.delete')}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}

export default OrganizerPage
