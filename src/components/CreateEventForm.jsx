import { useEffect, useRef, useState } from 'react'

import { isSupabaseUploadConfigured, uploadEventImageToSupabase } from '../api/aemApi'
import SearchableCategorySelect from './SearchableCategorySelect'
import '../styles/searchable-category-select.css'

const DEFAULT_EVENT_IMAGE = '/event-images/default-event.svg'
const SERVER_FIELD_NAME_MAP = {
  title: 'title',
  description: 'description',
  event_date: 'date',
  start_time: 'startTime',
  end_time: 'endTime',
  location: 'location',
  image_url: 'imageUrl',
  category: 'category',
  capacity: 'capacity',
}

const initialFormState = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  imageUrl: '',
  category: '',
  capacity: '',
}

function isDataImageUrl(value) {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('data:image/')
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
  if (!formData.startTime || formData.startTime.trim() === '') {
    nextErrors.startTime = 'Start time is required.'
  } else if (!/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(formData.startTime)) {
    nextErrors.startTime = 'Please use a valid time format.'
  }
  if (!formData.location.trim()) {
    nextErrors.location = 'Location is required.'
  }
  if (!formData.category || formData.category.trim() === '') {
    nextErrors.category = 'Category is required.'
  }

  if (formData.endTime && formData.endTime.trim() !== '' && !/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(formData.endTime)) {
    nextErrors.endTime = 'Please use a valid time format.'
  }

  if (formData.date && formData.startTime && formData.endTime) {
    const start = new Date(`${formData.date}T${formData.startTime}`)
    const end = new Date(`${formData.date}T${formData.endTime}`)

    if (end <= start) {
      nextErrors.endTime = 'End time must be later than start time.'
    }
  }

  if (formData.capacity) {
    const value = Number(formData.capacity)
    if (!Number.isInteger(value) || value < 1) {
      nextErrors.capacity = 'Capacity must be a whole number greater than 0.'
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

function formatTimeForBackend(timeValue) {
  // Return null for empty/undefined values (for optional fields)
  if (!timeValue || timeValue.trim() === '') {
    return null
  }
  
  // Handle various time formats and convert to HH:mm:ss format
  const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  const match = timeValue.match(timeRegex)
  
  if (!match) {
    return null
  }
  
  const hours = match[1].padStart(2, '0')
  const minutes = match[2].padStart(2, '0')
  const seconds = match[3] || '00'
  
  return `${hours}:${minutes}:${seconds}`
}

function getErrorMessage(value) {
  if (Array.isArray(value)) {
    return value.map(getErrorMessage).filter(Boolean).join(' ')
  }

  if (value && typeof value === 'object') {
    return Object.values(value).map(getErrorMessage).filter(Boolean).join(' ')
  }

  return typeof value === 'string' ? value.trim() : ''
}

function getFallbackSubmitError(error) {
  if (error?.status === 401) {
    return 'Your sign-in expired. Please sign in again and try again.'
  }

  if (error?.status === 408) {
    return 'The server is taking too long to respond. Please try again in a moment.'
  }

  if (error?.code === 'NETWORK_UNREACHABLE' || error?.status === 503) {
    return 'Could not reach the server. Please check your connection and try again.'
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }

  return 'Could not save the event. Please try again.'
}

function mapSubmitErrors(error) {
  const fieldErrors = {}
  let formError = ''
  const payload = error?.payload

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    Object.entries(payload).forEach(([key, value]) => {
      const message = getErrorMessage(value)
      if (!message) {
        return
      }

      const fieldName = SERVER_FIELD_NAME_MAP[key]
      if (fieldName) {
        fieldErrors[fieldName] = message
        return
      }

      if (key === 'detail' || key === 'message' || key === 'non_field_errors') {
        formError = formError || message
      }
    })
  }

  if (!formError && Object.keys(fieldErrors).length === 0) {
    formError = getFallbackSubmitError(error)
  }

  return { fieldErrors, formError }
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
    imageUrl: isDataImageUrl(initialValues.customImageUrl) ? '' : initialValues.customImageUrl ?? '',
    category: initialValues.category ?? '',
    capacity: initialValues.capacity != null ? String(initialValues.capacity) : '',
  }
}

function CreateEventForm({
  mode = 'create',
  initialValues = null,
  onCancel,
  onSubmit,
  titleId,
  currentUserId,
}) {
  const [formData, setFormData] = useState(() => buildFormState(initialValues))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const fileInputRef = useRef(null)

  const isEditMode = mode === 'edit'
  const panelTitle = isEditMode ? 'Edit Event' : 'Create Event'
  const panelSubtitle = isEditMode
    ? 'Update the details below'
    : 'Fill in the details below'
  const submitLabel = isEditMode ? 'Save Changes' : 'Create Event'
  const closeLabel = 'Close'
  const existingImage = initialValues?.image ?? ''
  const imagePreview = formData.imageUrl.trim() || existingImage || DEFAULT_EVENT_IMAGE
  const imageHelperText = isSupabaseUploadConfigured()
    ? 'Upload a clean cover image for better event discoverability.'
    : 'Image uploads are unavailable until storage is configured.'

  useEffect(() => {
    setFormData(buildFormState(initialValues))
    setErrors({})
    setSubmitError('')
    setIsSubmitting(false)
    setIsUploadingImage(false)
    setShowAdvanced(Boolean(initialValues?.endTime || initialValues?.capacity != null))
  }, [initialValues, mode])

  useEffect(() => {
    if (errors.endTime || errors.capacity) {
      setShowAdvanced(true)
    }
  }, [errors.capacity, errors.endTime])

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setSubmitError('')
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  async function handleImageUpload(event) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    setIsUploadingImage(true)

    try {
      const uploadedImageUrl = await uploadEventImageToSupabase(
        selectedFile,
        currentUserId ?? initialValues?.creatorId,
      )
      updateField('imageUrl', uploadedImageUrl)
    } catch (error) {
      setErrors((current) => ({
        ...current,
        imageUrl: error.message || 'Unable to upload image. Please try again.',
      }))
    } finally {
      setIsUploadingImage(false)
      event.target.value = ''
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isUploadingImage) {
      return
    }

    const nextErrors = validateEventForm(formData)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setSubmitError('')
    setIsSubmitting(true)

    try {
      const formattedStartTime = formatTimeForBackend(formData.startTime)
      const formattedEndTime = formatTimeForBackend(formData.endTime)

      const payload = {
        ...formData,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        existingImage,
        capacity:
          formData.capacity === '' || formData.capacity == null
            ? null
            : Number(formData.capacity),
      }

      await onSubmit(payload)
      setFormData(initialFormState)
      setErrors({})
      setSubmitError('')
    } catch (error) {
      const { fieldErrors, formError } = mapSubmitErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      }
      if (formError) {
        setSubmitError(formError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="create-event-panel">
      <form className="create-event-form" onSubmit={handleSubmit}>
        <header className="create-event-panel__header create-event-panel__header--sticky">
          <div>
            <h2 id={titleId}>{panelTitle}</h2>
            <p className="create-event-panel__subtitle">{panelSubtitle}</p>
          </div>
          <button type="button" className="create-event-panel__cancel" onClick={onCancel}>
            {closeLabel}
          </button>
        </header>

        <div className="create-event-panel__body">
          <label className="create-event-form__full">
            Event Title <span className="create-event-form__required">*</span>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Enter event title"
              disabled={isSubmitting || isUploadingImage}
            />
            {errors.title ? <span className="create-event-form__error">{errors.title}</span> : null}
          </label>

          <div className="create-event-form__full create-event-form__row">
            <label>
              Date <span className="create-event-form__required">*</span>
              <input
                type="date"
                lang="en"
                value={formData.date}
                onChange={(event) => updateField('date', event.target.value)}
                disabled={isSubmitting || isUploadingImage}
              />
              {errors.date ? <span className="create-event-form__error">{errors.date}</span> : null}
            </label>

            <label>
              Start Time <span className="create-event-form__required">*</span>
              <input
                type="time"
                lang="en"
                value={formData.startTime}
                onChange={(event) => updateField('startTime', event.target.value)}
                disabled={isSubmitting || isUploadingImage}
                required
              />
              {errors.startTime ? (
                <span className="create-event-form__error">{errors.startTime}</span>
              ) : null}
            </label>
          </div>

          <label className="create-event-form__full">
            Location <span className="create-event-form__required">*</span>
            <input
              type="text"
              value={formData.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="Enter location"
              disabled={isSubmitting || isUploadingImage}
            />
            {errors.location ? (
              <span className="create-event-form__error">{errors.location}</span>
            ) : null}
          </label>

          <div className="create-event-form__full">
            <SearchableCategorySelect
              label="Category *"
              value={formData.category}
              onChange={(value) => updateField('category', value)}
              disabled={isSubmitting || isUploadingImage}
              error={errors.category}
            />
          </div>

          <div className="create-event-form__full create-event-form__image-group">
            <div className="create-event-form__image-header">
              <label>
                Cover Image <span className="create-event-form__optional">(Optional)</span>
              </label>
              <div className="create-event-form__image-buttons">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="create-event-form__file-input"
                  onChange={handleImageUpload}
                  disabled={isSubmitting || isUploadingImage || !isSupabaseUploadConfigured()}
                />
                <button
                  type="button"
                  className="create-event-form__upload-button"
                  onClick={openFilePicker}
                  disabled={isSubmitting || isUploadingImage || !isSupabaseUploadConfigured()}
                >
                  {isUploadingImage ? 'Uploading...' : 'Upload image'}
                </button>
                <button
                  type="button"
                  className="create-event-form__upload-button create-event-form__upload-button--ghost"
                  onClick={() => updateField('imageUrl', '')}
                  disabled={isSubmitting || isUploadingImage || !formData.imageUrl}
                >
                  Remove
                </button>
              </div>
            </div>

            <p className="create-event-form__helper">{imageHelperText}</p>

            {errors.imageUrl ? (
              <span className="create-event-form__error">{errors.imageUrl}</span>
            ) : null}

            <div className="create-event-form__preview" role="status" aria-live="polite">
              <img
                src={imagePreview}
                alt="Event cover preview"
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_EVENT_IMAGE
                }}
              />
              <span>
                {imagePreview === DEFAULT_EVENT_IMAGE
                  ? 'Default event image preview'
                  : 'Custom image selected'}
              </span>
            </div>
          </div>

          <label className="create-event-form__full">
            Description <span className="create-event-form__required">*</span>
            <textarea
              value={formData.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Describe your event"
              rows="5"
              disabled={isSubmitting || isUploadingImage}
            />
            {errors.description ? (
              <span className="create-event-form__error">{errors.description}</span>
            ) : null}
          </label>

          <div className="create-event-form__full create-event-form__advanced-toggle-wrap">
            <button
              type="button"
              className="create-event-form__advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                className={showAdvanced ? 'is-open' : ''}
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
              {showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
            </button>
          </div>

          {showAdvanced ? (
            <div className="create-event-form__advanced-grid create-event-form__full">
              <label>
                End Time <span className="create-event-form__optional">(Optional)</span>
                <input
                  type="time"
                  lang="en"
                  value={formData.endTime}
                  onChange={(event) => updateField('endTime', event.target.value)}
                  disabled={isSubmitting || isUploadingImage}
                />
                {errors.endTime ? (
                  <span className="create-event-form__error">{errors.endTime}</span>
                ) : null}
              </label>

              <label>
                Capacity <span className="create-event-form__optional">(Optional)</span>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(event) => updateField('capacity', event.target.value)}
                  placeholder="Number of seats"
                  disabled={isSubmitting || isUploadingImage}
                />
                {errors.capacity ? (
                  <span className="create-event-form__error">{errors.capacity}</span>
                ) : null}
              </label>
            </div>
          ) : null}
        </div>

        {submitError ? (
          <div className="create-event-form__submit-feedback" role="alert" aria-live="assertive">
            {submitError}
          </div>
        ) : null}

        <footer className="create-event-form__actions create-event-form__actions--sticky">
          <button
            type="button"
            className="create-event-form__secondary"
            onClick={onCancel}
            disabled={isSubmitting || isUploadingImage}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="create-event-form__primary"
            disabled={isSubmitting || isUploadingImage}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </footer>
      </form>
    </section>
  )
}

export default CreateEventForm
