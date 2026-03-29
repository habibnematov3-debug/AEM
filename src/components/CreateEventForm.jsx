import { useEffect, useState } from 'react'

const initialFormState = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  imageUrl: '',
  category: '',
}

function validateEventForm(formData) {
  const nextErrors = {}

  if (!formData.title.trim()) {
    nextErrors.title = 'Event title is required.'
  }
  if (!formData.description.trim()) {
    nextErrors.description = 'Description is required.'
  }
  if (!formData.date) {
    nextErrors.date = 'Date is required.'
  }
  if (!formData.startTime) {
    nextErrors.startTime = 'Start time is required.'
  }
  if (!formData.endTime) {
    nextErrors.endTime = 'End time is required.'
  }
  if (!formData.location.trim()) {
    nextErrors.location = 'Location is required.'
  }

  if (formData.date && formData.startTime && formData.endTime) {
    const start = new Date(`${formData.date}T${formData.startTime}`)
    const end = new Date(`${formData.date}T${formData.endTime}`)

    if (end <= start) {
      nextErrors.endTime = 'End time must be later than start time.'
    }
  }

  return nextErrors
}

function normalizeDateForInput(dateValue) {
  if (!dateValue) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue
  }

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildFormState(initialValues) {
  if (!initialValues) {
    return initialFormState
  }

  return {
    title: initialValues.title ?? '',
    description: initialValues.description ?? '',
    date: normalizeDateForInput(initialValues.date),
    startTime: initialValues.startTime ?? initialValues.time ?? '',
    endTime: initialValues.endTime ?? '',
    location: initialValues.location ?? initialValues.venue ?? '',
    imageUrl: initialValues.image ?? '',
    category: initialValues.category ?? '',
  }
}

function CreateEventForm({ mode = 'create', initialValues = null, onCancel, onSubmit }) {
  const [formData, setFormData] = useState(() => buildFormState(initialValues))
  const [errors, setErrors] = useState({})

  const isEditMode = mode === 'edit'
  const panelEyebrow = isEditMode ? 'Existing event' : 'New event'
  const panelTitle = isEditMode ? 'Edit Event' : 'Create Event'
  const submitLabel = isEditMode ? 'Save Changes' : 'Create Event'
  const closeLabel = isEditMode ? 'Cancel edit' : 'Close'

  useEffect(() => {
    setFormData(buildFormState(initialValues))
    setErrors({})
  }, [initialValues, mode])

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateEventForm(formData)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    onSubmit(formData)
    setFormData(initialFormState)
    setErrors({})
  }

  return (
    <section className="create-event-panel">
      <div className="create-event-panel__header">
        <div>
          <p className="create-event-panel__eyebrow">{panelEyebrow}</p>
          <h2>{panelTitle}</h2>
        </div>
        <button type="button" className="create-event-panel__cancel" onClick={onCancel}>
          {closeLabel}
        </button>
      </div>

      <form className="create-event-form" onSubmit={handleSubmit}>
        <label>
          Event Title
          <input
            type="text"
            value={formData.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Enter event title"
          />
          {errors.title ? <span className="create-event-form__error">{errors.title}</span> : null}
        </label>

        <label className="create-event-form__full">
          Description
          <textarea
            value={formData.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Describe the event"
            rows="4"
          />
          {errors.description ? (
            <span className="create-event-form__error">{errors.description}</span>
          ) : null}
        </label>

        <label>
          Date
          <input
            type="date"
            value={formData.date}
            onChange={(event) => updateField('date', event.target.value)}
          />
          {errors.date ? <span className="create-event-form__error">{errors.date}</span> : null}
        </label>

        <label>
          Start Time
          <input
            type="time"
            value={formData.startTime}
            onChange={(event) => updateField('startTime', event.target.value)}
          />
          {errors.startTime ? (
            <span className="create-event-form__error">{errors.startTime}</span>
          ) : null}
        </label>

        <label>
          End Time
          <input
            type="time"
            value={formData.endTime}
            onChange={(event) => updateField('endTime', event.target.value)}
          />
          {errors.endTime ? (
            <span className="create-event-form__error">{errors.endTime}</span>
          ) : null}
        </label>

        <label>
          Location
          <input
            type="text"
            value={formData.location}
            onChange={(event) => updateField('location', event.target.value)}
            placeholder="Enter location"
          />
          {errors.location ? (
            <span className="create-event-form__error">{errors.location}</span>
          ) : null}
        </label>

        <label>
          Image URL
          <input
            type="text"
            value={formData.imageUrl}
            onChange={(event) => updateField('imageUrl', event.target.value)}
            placeholder="Optional image URL or local path"
          />
        </label>

        <label>
          Category
          <input
            type="text"
            value={formData.category}
            onChange={(event) => updateField('category', event.target.value)}
            placeholder="Optional category"
          />
        </label>

        <div className="create-event-form__actions">
          <button type="button" className="create-event-form__secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="create-event-form__primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}

export default CreateEventForm
