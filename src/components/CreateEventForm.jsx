import { useEffect, useRef, useState } from 'react'

import { isSupabaseUploadConfigured, uploadEventImageToSupabase } from '../api/aemApi'
import { useI18n } from '../i18n/LanguageContext'
import SearchableCategorySelect from './SearchableCategorySelect'
import '../styles/searchable-category-select.css'

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
  if (!formData.date) {
    nextErrors.date = t('eventForm.errors.date')
  }
  if (!formData.startTime || formData.startTime.trim() === '') {
    nextErrors.startTime = t('eventForm.errors.startTime')
  } else if (!/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(formData.startTime)) {
    nextErrors.startTime = t('eventForm.errors.timeFormat')
  }
  if (!formData.location.trim()) {
    nextErrors.location = t('eventForm.errors.location')
  }
  if (!formData.category || formData.category.trim() === '') {
    nextErrors.category = t('eventForm.errors.category')
  }

  if (formData.endTime && formData.endTime.trim() !== '' && !/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.test(formData.endTime)) {
    nextErrors.endTime = t('eventForm.errors.timeFormat')
  }

  if (formData.date && formData.startTime && formData.endTime) {
    const start = new Date(`${formData.date}T${formData.startTime}`)
    const end = new Date(`${formData.date}T${formData.endTime}`)

    if (end <= start) {
      nextErrors.endTime = t('eventForm.errors.endTimeOrder')
    }
  }

  if (formData.capacity) {
    const value = Number(formData.capacity)
    if (!Number.isInteger(value) || value < 1) {
      nextErrors.capacity = t('eventForm.errors.capacity')
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
  const { t } = useI18n()
  const [formData, setFormData] = useState(() => buildFormState(initialValues))
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
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
      const formattedStartTime = formatTimeForBackend(formData.startTime)
      const formattedEndTime = formatTimeForBackend(formData.endTime)
      
      console.log('Time formatting debug:', {
        original: { startTime: formData.startTime, endTime: formData.endTime },
        formatted: { startTime: formattedStartTime, endTime: formattedEndTime }
      })

      const payload = {
        ...formData,
        startTime: formattedStartTime,
        endTime: formattedEndTime, // Already returns null if empty
        existingImage,
        capacity:
          formData.capacity === '' || formData.capacity == null
            ? null
            : Number(formData.capacity),
      }

      await onSubmit(payload)
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
        <label className="create-event-form__full">
          {t('eventForm.title')} *
          <input
            type="text"
            value={formData.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder={t('eventForm.enterTitle')}
            disabled={isSubmitting || isUploadingImage}
          />
          {errors.title ? <span className="create-event-form__error">{errors.title}</span> : null}
        </label>

        <label>
          {t('common.date')} *
          <input
            type="date"
            value={formData.date}
            onChange={(event) => updateField('date', event.target.value)}
            disabled={isSubmitting || isUploadingImage}
          />
          {errors.date ? <span className="create-event-form__error">{errors.date}</span> : null}
        </label>

        <label>
          {t('common.startTime')} *
          <input
            type="time"
            value={formData.startTime}
            onChange={(event) => updateField('startTime', event.target.value)}
            disabled={isSubmitting || isUploadingImage}
            required
          />
          {errors.startTime ? (
            <span className="create-event-form__error">{errors.startTime}</span>
          ) : null}
        </label>

        <label>
          {t('common.location')} *
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

        <div className="create-event-form__full create-event-form__image-group">
          <div className="create-event-form__image-header">
            <label>Event Cover <span style={{fontWeight: 'normal', color: 'var(--text-3)'}}>(Optional)</span></label>
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

          {errors.imageUrl ? (
            <span className="create-event-form__error">{errors.imageUrl}</span>
          ) : null}

          <div className="create-event-form__preview">
            <img
              src={imagePreview}
              alt={t('eventForm.previewAlt')}
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

        <div className="create-event-form__full" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fill: 'currentColor' }}>
              <path d="M7 10l5 5 5-5z" />
            </svg>
            {showAdvanced ? 'Hide details' : 'Add more details'}
          </button>
        </div>

        {showAdvanced && (
          <>
            <label className="create-event-form__full">
              {t('eventForm.description')} <span style={{fontWeight: 'normal', color: 'var(--text-3)'}}>(Optional)</span>
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
              {t('common.endTime')} <span style={{fontWeight: 'normal', color: 'var(--text-3)'}}>(Optional)</span>
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
              {t('eventForm.capacity')} <span style={{fontWeight: 'normal', color: 'var(--text-3)'}}>(Optional)</span>
              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(event) => updateField('capacity', event.target.value)}
                placeholder={t('eventForm.capacityPlaceholder')}
                disabled={isSubmitting || isUploadingImage}
              />
              {errors.capacity ? (
                <span className="create-event-form__error">{errors.capacity}</span>
              ) : null}
            </label>

            <label>
              {t('common.category')} *
              <SearchableCategorySelect
                value={formData.category}
                onChange={(value) => updateField('category', value)}
                disabled={isSubmitting || isUploadingImage}
                error={errors.category}
              />
            </label>
          </>
        )}

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
