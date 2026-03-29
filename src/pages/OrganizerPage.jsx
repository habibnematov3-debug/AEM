import { useMemo } from 'react'

import CreateEventForm from '../components/CreateEventForm'
import EventCard from '../components/EventCard'
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

  async function handleCreate(formData) {
    try {
      const createdEvent = await onCreateEvent(formData)
      setFormFeedback({ type: 'success', message: 'Event created successfully.' })
      setEditingEvent(null)
      setIsCreateFormOpen(false)
      return createdEvent
    } catch (error) {
      setFormFeedback({
        type: 'error',
        message: error.message || 'Could not create the event.',
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
      setFormFeedback({ type: 'success', message: 'Event updated successfully.' })
      setEditingEvent(null)
      setIsCreateFormOpen(false)
      return updatedEvent
    } catch (error) {
      setFormFeedback({
        type: 'error',
        message: error.message || 'Could not update the event.',
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
      setFormFeedback({ type: 'success', message: 'Event deleted successfully.' })
      setEventPendingDelete(null)
    } catch (error) {
      setFormFeedback({
        type: 'error',
        message: error.message || 'Could not delete the event.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="organizer-events-page">
      <div className="organizer-events-page__topbar">
        <div className="organizer-events-page__intro">
          <p className="organizer-events-page__eyebrow">Organizer workspace</p>
          <h1>My Events</h1>
          <p>Manage and view the events you've created</p>
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
          Create Event
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

      {isCreateFormOpen ? (
        <CreateEventForm
          mode="create"
          initialValues={null}
          onCancel={handleCancelForm}
          onSubmit={handleCreate}
        />
      ) : null}

      {editingEvent ? (
        <Modal size="lg" onClose={handleCancelForm} labelledBy="edit-event-title">
          <CreateEventForm
            mode="edit"
            initialValues={editingEvent}
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
          <h2>{hasAccountEvents ? 'No events found' : 'You have no events yet'}</h2>
          <p>
            {hasAccountEvents
              ? 'Try another keyword in the search bar.'
              : 'Create your first event to start managing it here'}
          </p>
        </div>
      )}

      {eventPendingDelete ? (
        <Modal onClose={handleCancelDelete} labelledBy="delete-event-title">
          <div className="organizer-events-dialog">
            <div className="organizer-events-dialog__copy">
              <p className="organizer-events-dialog__eyebrow">Delete event</p>
              <h2 id="delete-event-title">Are you sure you want to delete this event?</h2>
              <p>
                <strong>{eventPendingDelete.title}</strong> will be removed from My Events, the
                students page, and the details page.
              </p>
            </div>

            <div className="organizer-events-dialog__actions">
              <button
                type="button"
                className="create-event-form__secondary"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="organizer-events-dialog__delete-button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}

export default OrganizerPage
