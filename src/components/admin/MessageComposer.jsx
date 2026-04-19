import { useMemo, useState } from 'react'

import { createAdminBroadcast } from '../../api/aemApi'

const TEMPLATES = [
  { key: '', subject: '', body: '' },
  {
    key: 'maintenance',
    subject: 'Scheduled platform maintenance',
    body:
      'We will perform brief maintenance on the event platform. During this window you may see slower responses or short interruptions.\n\nThank you for your patience.',
  },
  {
    key: 'welcome',
    subject: 'Welcome to AEM',
    body:
      'Thank you for being part of the Ajou Event Manager community. Browse upcoming events, join activities that interest you, and stay tuned for organizer updates.',
  },
]

function toIsoOrNull(localValue) {
  if (!localValue || typeof localValue !== 'string') {
    return null
  }
  const parsed = new Date(localValue)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

export default function MessageComposer({ t, onSent }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipientFilter, setRecipientFilter] = useState('all')
  const [priority, setPriority] = useState('normal')
  const [templateKey, setTemplateKey] = useState('')
  const [scheduleLocal, setScheduleLocal] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const templateOptions = useMemo(
    () => [
      { key: '', label: t('adminPage.broadcast.templateNone') },
      { key: 'maintenance', label: t('adminPage.broadcast.templateMaintenance') },
      { key: 'welcome', label: t('adminPage.broadcast.templateWelcome') },
    ],
    [t],
  )

  function applyTemplate(key) {
    setTemplateKey(key)
    if (!key) {
      setSubject('')
      setBody('')
      return
    }
    const found = TEMPLATES.find((item) => item.key === key)
    if (found) {
      setSubject(found.subject)
      setBody(found.body)
    }
  }

  async function handleSendNow() {
    setError('')
    if (!subject.trim() || !body.trim()) {
      setError(t('adminPage.broadcast.subjectBodyRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createAdminBroadcast({
        subject: subject.trim(),
        body: body.trim(),
        recipientFilter,
        priority,
        scheduledAt: null,
        templateKey: templateKey || null,
      })
      
      if (result.status === 'failed') {
        setError(t('adminPage.broadcast.sendFailed'))
        setIsSubmitting(false)
        return
      }
      
      setSubject('')
      setBody('')
      setScheduleLocal('')
      setTemplateKey('')
      if (typeof onSent === 'function') {
        await onSent()
      }
    } catch (err) {
      if (err.status === 429) {
        setError(t('adminPage.broadcast.rateLimited'))
      } else {
        const apiMessage = typeof err?.message === 'string' ? err.message.trim() : ''
        setError(apiMessage || t('adminPage.broadcast.sendError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSchedule() {
    setError('')
    if (!subject.trim() || !body.trim()) {
      setError(t('adminPage.broadcast.subjectBodyRequired'))
      return
    }
    const scheduledAt = toIsoOrNull(scheduleLocal)
    if (!scheduledAt) {
      setError(t('adminPage.broadcast.scheduleRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await createAdminBroadcast({
        subject: subject.trim(),
        body: body.trim(),
        recipientFilter,
        priority,
        scheduledAt,
        templateKey: templateKey || null,
      })
      
      setSubject('')
      setBody('')
      setScheduleLocal('')
      setTemplateKey('')
      if (typeof onSent === 'function') {
        await onSent()
      }
    } catch (err) {
      if (err.status === 429) {
        setError(t('adminPage.broadcast.rateLimited'))
      } else {
        const apiMessage = typeof err?.message === 'string' ? err.message.trim() : ''
        setError(apiMessage || t('adminPage.broadcast.sendError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-broadcast__composer">
      <div className="admin-broadcast__composer-grid">
        <label className="admin-broadcast__field">
          <span>{t('adminPage.broadcast.templateLabel')}</span>
          <select
            value={templateKey}
            onChange={(e) => applyTemplate(e.target.value)}
            disabled={isSubmitting}
          >
            {templateOptions.map((opt) => (
              <option key={opt.key || 'none'} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-broadcast__field admin-broadcast__field--full">
          <span>{t('adminPage.broadcast.subjectLabel')}</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            disabled={isSubmitting}
            autoComplete="off"
          />
        </label>

        <label className="admin-broadcast__field admin-broadcast__field--full">
          <span>{t('adminPage.broadcast.bodyLabel')}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            disabled={isSubmitting}
            className="admin-broadcast__textarea"
          />
          <span className="admin-broadcast__hint">{t('adminPage.broadcast.bodyHint')}</span>
        </label>

        <fieldset className="admin-broadcast__fieldset admin-broadcast__field--full">
          <legend>{t('adminPage.broadcast.recipientLabel')}</legend>
          <div className="admin-broadcast__radio-row">
            {[
              { value: 'all', label: t('adminPage.broadcast.recipientAll') },
              { value: 'students', label: t('adminPage.broadcast.recipientStudents') },
              { value: 'organizers', label: t('adminPage.broadcast.recipientOrganizers') },
              { value: 'admins', label: t('adminPage.broadcast.recipientAdmins') },
            ].map((opt) => (
              <label key={opt.value} className="admin-broadcast__radio">
                <input
                  type="radio"
                  name="broadcast-recipients"
                  value={opt.value}
                  checked={recipientFilter === opt.value}
                  onChange={() => setRecipientFilter(opt.value)}
                  disabled={isSubmitting}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="admin-broadcast__field">
          <span>{t('adminPage.broadcast.priorityLabel')}</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="normal">{t('adminPage.broadcast.priorityNormal')}</option>
            <option value="high">{t('adminPage.broadcast.priorityHigh')}</option>
          </select>
        </label>

        <label className="admin-broadcast__field admin-broadcast__field--full">
          <span>{t('adminPage.broadcast.scheduleLabel')}</span>
          <input
            type="datetime-local"
            value={scheduleLocal}
            onChange={(e) => setScheduleLocal(e.target.value)}
            disabled={isSubmitting}
          />
          <span className="admin-broadcast__hint">{t('adminPage.broadcast.scheduleHint')}</span>
        </label>
      </div>

      {error ? <p className="admin-broadcast__error" role="alert">{error}</p> : null}

      <div className="admin-broadcast__actions">
        <button
          type="button"
          className="admin-page__action-button"
          onClick={handleSendNow}
          disabled={isSubmitting}
        >
          {isSubmitting ? t('adminPage.broadcast.sending') : t('adminPage.broadcast.submitSend')}
        </button>
        <button
          type="button"
          className="admin-page__action-button admin-page__action-button--ghost"
          onClick={handleSchedule}
          disabled={isSubmitting}
        >
          {t('adminPage.broadcast.submitSchedule')}
        </button>
      </div>
    </div>
  )
}
