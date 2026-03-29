import { useEffect, useRef, useState } from 'react'

const DEFAULT_EVENT_IMAGE = '/event-images/default-event.svg'

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
    imageUrl: initialValues.customImageUrl ?? '',
    category: initialValues.category ?? '',
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Could not read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function CreateEventForm({ mode = 'create', initialValues = null, onCancel, onSubmit, titleId }) {
  const [formData, setFormData] = useState(() => buildFormState(initialValues))
  const [errors, setErrors] = useState({})
  const [uploadedImage, setUploadedImage] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const isEditMode = mode === 'edit'
  const panelEyebrow = isEditMode ? 'Existing event' : 'New event'
  const panelTitle = isEditMode ? 'Edit Event' : 'Create Event'
  const submitLabel = isEditMode ? 'Save Changes' : 'Create Event'
  const closeLabel = isEditMode ? 'Cancel edit' : 'Close'
  const existingImage = initialValues?.image ?? ''
  const imagePreview = uploadedImage || formData.imageUrl.trim() || existingImage || DEFAULT_EVENT_IMAGE
  const imageHelperText =
    'Upload from your device or leave empty to use a default event image'

  useEffect(() => {
    setFormData(buildFormState(initialValues))
    setErrors({})
    setUploadedImage('')
    setSelectedFileName('')
    setIsSubmitting(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [initialValues, mode])

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateEventForm(formData)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        ...formData,
        uploadedImage,
        existingImage,
      })
      setFormData(initialFormState)
      setErrors({})
      setUploadedImage('')
      setSelectedFileName('')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenFilePicker() {
    fileInputRef.current?.click()
  }

  async function handleImageSelected(event) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      return
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(selectedFile)
      setUploadedImage(imageDataUrl)
      setSelectedFileName(selectedFile.name)
    } catch {
      setSelectedFileName('')
      setUploadedImage('')
    } finally {
      event.target.value = ''
    }
  }

  function handleRemoveUploadedImage() {
    setUploadedImage('')
    setSelectedFileName('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <section className="create-event-panel">
      <div className="create-event-panel__header">
        <div>
          <p className="create-event-panel__eyebrow">{panelEyebrow}</p>
          <h2 id={titleId}>{panelTitle}</h2>
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
          {errors.date ? <span className="create-event-form__error">{errors.date}</span> : null}
        </label>

        <label>
          Start Time
          <input
            type="time"
            value={formData.startTime}
            onChange={(event) => updateField('startTime', event.target.value)}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
          {errors.location ? (
            <span className="create-event-form__error">{errors.location}</span>
          ) : null}
        </label>

        <div className="create-event-form__full create-event-form__image-group">
          <div className="create-event-form__image-header">
            <label htmlFor="event-image-url">Image URL</label>

            <div className="create-event-form__image-buttons">
              <button
                type="button"
                className="create-event-form__upload-button"
                onClick={handleOpenFilePicker}
                disabled={isSubmitting}
              >
                Upload Image
              </button>

              {uploadedImage ? (
                <button
                  type="button"
                  className="create-event-form__upload-button create-event-form__upload-button--ghost"
                  onClick={handleRemoveUploadedImage}
                  disabled={isSubmitting}
                >
                  Remove Upload
                </button>
              ) : null}
            </div>
          </div>

          <input
            id="event-image-url"
            type="text"
            value={formData.imageUrl}
            onChange={(event) => updateField('imageUrl', event.target.value)}
            placeholder="Optional image URL"
            disabled={isSubmitting}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="create-event-form__file-input"
            onChange={handleImageSelected}
            disabled={isSubmitting}
          />

          <p className="create-event-form__helper">{imageHelperText}</p>

          <div className="create-event-form__preview">
            <img
              src={imagePreview}
              alt="Event preview"
              onError={(event) => {
                event.currentTarget.src = DEFAULT_EVENT_IMAGE
              }}
            />
            <span>
              {selectedFileName
                ? `Selected file: ${selectedFileName}`
                : imagePreview === DEFAULT_EVENT_IMAGE
                  ? 'Default event image preview'
                  : 'Current event image preview'}
            </span>
          </div>
        </div>

        <label>
          Category
          <input
            type="text"
            value={formData.category}
            onChange={(event) => updateField('category', event.target.value)}
            placeholder="Optional category"
            disabled={isSubmitting}
          />
        </label>

        <div className="create-event-form__actions">
          <button
            type="button"
            className="create-event-form__secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className="create-event-form__primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}

export default CreateEventForm
