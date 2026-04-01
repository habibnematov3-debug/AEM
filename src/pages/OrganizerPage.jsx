import { useMemo } from 'react'

import CreateEventForm from '../components/CreateEventForm'
import EventCard from '../components/EventCard'
import { useI18n } from '../i18n/LanguageContext'
import Modal from '../components/Modal'
import '../styles/organizer-events.css'
import { useState } from 'react'

function OrganizerPage({
  currentUser,
  events = [],
  searchValue = '',
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}) {
  const { t } = useI18n()
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventPendingDelete, setEventPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formFeedback, setFormFeedback] = useState({ type: '', message: '' })

  const userEvents = useMemo(() => {
    const ownedEvents = events.filter((event) => event.creatorId === currentUser?.id)
    const query = searchValue.trim().toLowerCase()

    if (!query) {
      return ownedEvents
    }

    return ownedEvents.filter((event) => {
      const haystack = `${event.title} ${event.location} ${event.category}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [currentUser, events, searchValue])

  const hasAccountEvents = events.some((event) => event.creatorId === currentUser?.id)
  const statusSummary = useMemo(
    () => ({
      pending: userEvents.filter((event) => event.moderationStatus === 'pending').length,
      approved: userEvents.filter((event) => event.moderationStatus === 'approved').length,
      rejected: userEvents.filter((event) => event.moderationStatus === 'rejected').length,
    }),
    [userEvents],
  )

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
        <div className="organizer-events-page__intro">
          <p className="organizer-events-page__eyebrow">{t('organizerPage.eyebrow')}</p>
          <h1>{t('organizerPage.title')}</h1>
          <p>{t('organizerPage.subtitle')}</p>
          <p className="organizer-events-page__note">{t('organizerPage.reviewSummary')}</p>
        </div>

        <button
          type="button"
          className="organizer-events-page__create-button"
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
        {Object.entries(statusSummary).map(([statusKey, count]) => (
          <article key={statusKey} className="organizer-events-page__status-card">
            <span>{t(`organizerPage.statusSummary.${statusKey}`)}</span>
            <strong>{count}</strong>
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

      {userEvents.length ? (
        <div className="organizer-events-grid">
          {userEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              variant="organizer-minimal"
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
