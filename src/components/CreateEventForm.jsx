import { useEffect, useRef, useState } from 'react'

import { isSupabaseUploadConfigured, uploadEventImageToSupabase } from '../api/aemApi'
import { useI18n } from '../i18n/LanguageContext'

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
  capacity: '',
}

function isDataImageUrl(value) {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('data:image/')
}

function validateEventForm(formData, t) {
  const nextErrors = {}

  if (!formData.title.trim()) {
    nextErrors.title = t('eventForm.errors.title')
  }
  if (!formData.description.trim()) {
    nextErrors.description = t('eventForm.errors.description')
  }
  if (!formData.date) {
    nextErrors.date = t('eventForm.errors.date')
  }
  if (!formData.startTime) {
    nextErrors.startTime = t('eventForm.errors.startTime')
  }
  if (!formData.endTime) {
    nextErrors.endTime = t('eventForm.errors.endTime')
  }
  if (!formData.location.trim()) {
    nextErrors.location = t('eventForm.errors.location')
  }

  if (formData.date && formData.startTime && formData.endTime) {
    const start = new Date(`${formData.date}T${formData.startTime}`)
    const end = new Date(`${formData.date}T${formData.endTime}`)

    if (end <= start) {
      nextErrors.endTime = t('eventForm.errors.endTimeOrder')
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
    imageUrl: isDataImageUrl(initialValues.customImageUrl) ? '' : initialValues.customImageUrl ?? '',
    category: initialValues.category ?? '',
    capacity:
      initialValues.capacity == null || Number.isNaN(Number(initialValues.capacity))
        ? ''
        : String(initialValues.capacity),
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
  const { t } = useI18n()
  const [formData, setFormData] = useState(() => buildFormState(initialValues))
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef(null)

  const isEditMode = mode === 'edit'
  const panelEyebrow = isEditMode ? t('eventForm.existingEvent') : t('eventForm.newEvent')
  const panelTitle = isEditMode ? t('eventForm.editTitle') : t('eventForm.createTitle')
  const submitLabel = isEditMode ? t('eventForm.editSubmit') : t('eventForm.createSubmit')
  const closeLabel = isEditMode ? t('eventForm.cancelEdit') : t('eventForm.close')
  const existingImage = initialValues?.image ?? ''
  const imagePreview = formData.imageUrl.trim() || existingImage || DEFAULT_EVENT_IMAGE
  const imageHelperText = isSupabaseUploadConfigured()
    ? t('eventForm.imageHelperConfigured')
    : t('eventForm.imageHelperFallback')

  useEffect(() => {
    setFormData(buildFormState(initialValues))
    setErrors({})
    setIsSubmitting(false)
    setIsUploadingImage(false)
  }, [initialValues, mode])

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
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
        imageUrl: error.message || t('eventForm.errors.uploadImage'),
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

    const nextErrors = validateEventForm(formData, t)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        ...formData,
        existingImage,
      })
      setFormData(initialFormState)
      setErrors({})
    } finally {
      setIsSubmitting(false)
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
          {t('eventForm.title')}
          <input
            type="text"
            value={formData.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder={t('eventForm.enterTitle')}
            disabled={isSubmitting || isUploadingImage}
          />
          {errors.title ? <span className="create-event-form__error">{errors.title}</span> : null}
        </label>

        <label className="create-event-form__full">
          {t('eventForm.description')}
          <textarea
            value={formData.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder={t('eventForm.describeEvent')}
            rows="4"
            disabled={isSubmitting || isUploadingImage}
          />
          {errors.description ? (
            <span className="create-event-form__error">{errors.description}</span>
          ) : null}
        </label>

        <label>
          {t('common.date')}
          <input
            type="date"
            value={formData.date}
            onChange={(event) => updateField('date', event.target.value)}
            disabled={isSubmitting || isUploadingImage}
          />
          {errors.date ? <span className="create-event-form__error">{errors.date}</span> : null}
        </label>

        <label>
          {t('common.startTime')}
          <input
            type="time"
            value={formData.startTime}
            onChange={(event) => updateField('startTime', event.target.value)}
            disabled={isSubmitting || isUploadingImage}
          />
          {errors.startTime ? (
            <span className="create-event-form__error">{errors.startTime}</span>
          ) : null}
        </label>

        <label>
          {t('common.endTime')}
          <input
            type="time"
            value={formData.endTime}
            onChange={(event) => updateField('endTime', event.target.value)}
            disabled={isSubmitting || isUploadingImage}
          />
          {errors.endTime ? (
            <span className="create-event-form__error">{errors.endTime}</span>
          ) : null}
        </label>

        <label>
          {t('common.location')}
          <input
            type="text"
            value={formData.location}
            onChange={(event) => updateField('location', event.target.value)}
            placeholder={t('eventForm.enterLocation')}
            disabled={isSubmitting || isUploadingImage}
          />
          {errors.location ? (
            <span className="create-event-form__error">{errors.location}</span>
          ) : null}
        </label>

        <label>
          {t('eventForm.capacity')}
          <input
            type="number"
            min="1"
            step="1"
            value={formData.capacity}
            onChange={(event) => updateField('capacity', event.target.value)}
            placeholder={t('eventForm.optionalCapacity')}
            disabled={isSubmitting || isUploadingImage}
          />
        </label>

        <div className="create-event-form__full create-event-form__image-group">
          <div className="create-event-form__image-header">
            <label htmlFor="event-image-url">{t('eventForm.imageUrl')}</label>
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
                {isUploadingImage ? t('eventForm.uploading') : t('eventForm.uploadImage')}
              </button>
              <button
                type="button"
                className="create-event-form__upload-button create-event-form__upload-button--ghost"
                onClick={() => updateField('imageUrl', '')}
                disabled={isSubmitting || isUploadingImage || !formData.imageUrl}
              >
                {t('eventForm.removeImage')}
              </button>
            </div>
          </div>

          <input
            id="event-image-url"
            type="text"
            value={formData.imageUrl}
            onChange={(event) => updateField('imageUrl', event.target.value)}
            placeholder={t('eventForm.optionalImageUrl')}
            disabled={isSubmitting || isUploadingImage}
          />

          <p className="create-event-form__helper">{imageHelperText}</p>

          {errors.imageUrl ? (
            <span className="create-event-form__error">{errors.imageUrl}</span>
          ) : null}

          <div className="create-event-form__preview">
            <img
              src={imagePreview}
              alt="Event preview"
              onError={(event) => {
                event.currentTarget.src = DEFAULT_EVENT_IMAGE
              }}
            />
            <span>
              {imagePreview === DEFAULT_EVENT_IMAGE
                ? t('eventForm.defaultPreview')
                : t('eventForm.currentPreview')}
            </span>
          </div>
        </div>

        <label>
          {t('common.category')}
          <input
            type="text"
            value={formData.category}
            onChange={(event) => updateField('category', event.target.value)}
            placeholder={t('eventForm.optionalCategory')}
            disabled={isSubmitting || isUploadingImage}
          />
        </label>

        <div className="create-event-form__actions">
          <button
            type="button"
            className="create-event-form__secondary"
            onClick={onCancel}
            disabled={isSubmitting || isUploadingImage}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="create-event-form__primary"
            disabled={isSubmitting || isUploadingImage}
          >
            {isSubmitting ? t('common.saving') : submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}

export default CreateEventForm
