import { useMemo } from 'react'

import CreateEventForm from '../components/CreateEventForm'
import EventCard from '../components/EventCard'
import { getCurrentMockUser, studentPageData } from '../data/mockData'
import '../styles/organizer-events.css'
import { useState } from 'react'

function OrganizerPage({
  events = studentPageData.events,
  searchValue = '',
  onCreateEvent,
  onUpdateEvent,
}) {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const activeUser = getCurrentMockUser() ?? studentPageData.user

  const userEvents = useMemo(() => {
    const ownedEvents = events.filter((event) => event.creatorId === activeUser?.id)
    const query = searchValue.trim().toLowerCase()

    if (!query) {
      return ownedEvents
    }

    return ownedEvents.filter((event) => {
      const haystack = `${event.title} ${event.location} ${event.category}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [activeUser, events, searchValue])

  const hasAccountEvents = events.some((event) => event.creatorId === activeUser?.id)

  function handleCreate(formData) {
    onCreateEvent(formData)
    setEditingEvent(null)
    setIsCreateFormOpen(false)
  }

  function handleEdit(event) {
    setEditingEvent(event)
    setIsCreateFormOpen(true)
  }

  function handleUpdate(formData) {
    if (!editingEvent) {
      return
    }

    onUpdateEvent(editingEvent.id, formData)
    setEditingEvent(null)
    setIsCreateFormOpen(false)
  }

  function handleCancelForm() {
    setEditingEvent(null)
    setIsCreateFormOpen(false)
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
            setEditingEvent(null)
            setIsCreateFormOpen(true)
          }}
        >
          Create Event
        </button>
      </div>

      {isCreateFormOpen ? (
        <CreateEventForm
          mode={editingEvent ? 'edit' : 'create'}
          initialValues={editingEvent}
          onCancel={handleCancelForm}
          onSubmit={editingEvent ? handleUpdate : handleCreate}
        />
      ) : null}

      {userEvents.length ? (
        <div className="organizer-events-grid">
          {userEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              variant="organizer-minimal"
              onEdit={handleEdit}
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
    </section>
  )
}

export default OrganizerPage
