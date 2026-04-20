import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/LanguageContext'
import '../../styles/rejection-modal.css'

const REJECTION_TEMPLATES = [
  {
    id: 'inappropriate_content',
    label: 'Inappropriate content',
    value: 'The event title or description contains inappropriate or offensive language. Please use descriptive, family-friendly language and resubmit.',
  },
  {
    id: 'duplicate_event',
    label: 'Duplicate event',
    value: 'A similar event already exists at the same time and location. Please check for existing events before creating a new one.',
  },
  {
    id: 'insufficient_details',
    label: 'Insufficient details',
    value: 'The event is missing important details such as a clear description, specific location, or time. Please provide more information.',
  },
  {
    id: 'venue_issue',
    label: 'Venue not verified',
    value: 'The venue information cannot be verified. Please provide a valid location with proper details (building name, room number, address).',
  },
  {
    id: 'policy_violation',
    label: 'Policy violation',
    value: 'This event does not comply with our community guidelines. Please review our policies and resubmit a compliant event.',
  },
  {
    id: 'capacity_issue',
    label: 'Capacity concern',
    value: 'The event capacity appears inconsistent with the venue or raises safety concerns. Please adjust the capacity and resubmit.',
  },
]

function RejectionModal({ isOpen, eventTitle, onConfirm, onCancel, isLoading }) {
  const { t } = useI18n()
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate('')
      setCustomReason('')
      setShowCustom(false)
    }
  }, [isOpen])

  function handleTemplateSelect(templateId) {
    const template = REJECTION_TEMPLATES.find((t) => t.id === templateId)
    setSelectedTemplate(templateId)
    setCustomReason(template.value)
    setShowCustom(false)
  }

  function handleCustomToggle() {
    if (!showCustom) {
      setSelectedTemplate('')
      setCustomReason('')
      setShowCustom(true)
    } else {
      setShowCustom(false)
      setSelectedTemplate('')
      setCustomReason('')
    }
  }

  function handleConfirm() {
    const reason = customReason.trim()
    if (!reason) {
      alert('Please provide a rejection reason or select a template.')
      return
    }
    onConfirm(reason)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="rejection-modal__overlay" onClick={onCancel}>
      <div className="rejection-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="rejection-modal__header">
          <h2>Reject Event</h2>
          <p className="rejection-modal__subtitle">Event: {eventTitle}</p>
        </div>

        <div className="rejection-modal__content">
          <p className="rejection-modal__instruction">
            Select a rejection reason template or provide custom feedback for the organizer:
          </p>

          <div className="rejection-modal__templates">
            {REJECTION_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`rejection-modal__template-button ${
                  selectedTemplate === template.id ? 'rejection-modal__template-button--selected' : ''
                }`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                {template.label}
              </button>
            ))}
          </div>

          <div className="rejection-modal__divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className={`rejection-modal__custom-button ${showCustom ? 'rejection-modal__custom-button--active' : ''}`}
            onClick={handleCustomToggle}
          >
            {showCustom ? '✓ Custom Reason' : '+ Custom Reason'}
          </button>

          {(showCustom || selectedTemplate) && (
            <div className="rejection-modal__textarea-wrapper">
              <textarea
                className="rejection-modal__textarea"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter your rejection reason here..."
                rows="5"
                disabled={isLoading}
              />
              <div className="rejection-modal__char-count">
                {customReason.length}/500 characters
              </div>
            </div>
          )}
        </div>

        <div className="rejection-modal__footer">
          <button
            type="button"
            className="rejection-modal__cancel-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rejection-modal__confirm-button"
            onClick={handleConfirm}
            disabled={isLoading || !customReason.trim()}
          >
            {isLoading ? 'Rejecting...' : 'Reject Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RejectionModal
