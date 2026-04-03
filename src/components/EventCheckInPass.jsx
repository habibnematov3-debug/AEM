import { useEffect, useState } from 'react'

import QRCode from 'qrcode'

import {
  buildAbsoluteCheckInResultUrl,
  fetchMyCheckInPass,
} from '../api/aemApi'
import { useI18n } from '../i18n/LanguageContext'
import { getLanguageLocale } from '../i18n/translations'

function formatTimestamp(value, languageCode) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString(getLanguageLocale(languageCode), {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function EventCheckInPass({ eventId }) {
  const { languageCode, t } = useI18n()
  const [passStatus, setPassStatus] = useState('loading')
  const [passError, setPassError] = useState('')
  const [passData, setPassData] = useState(null)
  const [qrMarkup, setQrMarkup] = useState('')
  const [qrStatus, setQrStatus] = useState('idle')
  const [copyState, setCopyState] = useState('idle')

  useEffect(() => {
    let isMounted = true

    async function loadPass() {
      setPassStatus('loading')
      setPassError('')
      setPassData(null)

      try {
        const payload = await fetchMyCheckInPass(eventId)
        if (!isMounted) {
          return
        }

        setPassData(payload)
        setPassStatus('ready')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setPassError(error.message || t('eventDetails.checkInPassError'))
        setPassStatus('error')
      }
    }

    loadPass()

    return () => {
      isMounted = false
    }
  }, [eventId, t])

  useEffect(() => {
    let isMounted = true

    async function generateQrMarkup() {
      if (!passData?.token || passData.participation?.checkedInAt) {
        setQrMarkup('')
        setQrStatus('idle')
        return
      }

      setQrStatus('loading')

      try {
        const checkInUrl = buildAbsoluteCheckInResultUrl(eventId, passData.token)
        const nextMarkup = await QRCode.toString(checkInUrl, {
          type: 'svg',
          errorCorrectionLevel: 'M',
          margin: 1,
          color: {
            dark: '#0f1b2e',
            light: '#ffffff',
          },
        })

        if (!isMounted) {
          return
        }

        setQrMarkup(nextMarkup)
        setQrStatus('ready')
      } catch {
        if (!isMounted) {
          return
        }

        setQrMarkup('')
        setQrStatus('error')
      }
    }

    generateQrMarkup()

    return () => {
      isMounted = false
    }
  }, [eventId, passData])

  async function handleCopyLink() {
    const token = passData?.token ?? ''
    if (!token || !navigator?.clipboard?.writeText) {
      return
    }

    try {
      await navigator.clipboard.writeText(buildAbsoluteCheckInResultUrl(eventId, token))
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1600)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 1600)
    }
  }

  const checkedInAt = passData?.participation?.checkedInAt ?? ''

  return (
    <section className="event-details-pass" aria-live="polite">
      <div className="event-details-pass__header">
        <div>
          <h2>{t('eventDetails.checkInPassTitle')}</h2>
          <p>
            {checkedInAt
              ? t('eventDetails.checkInPassCheckedIn')
              : t('eventDetails.checkInPassDescription')}
          </p>
        </div>

        {passData?.token && !checkedInAt ? (
          <button
            type="button"
            className="event-details-pass__copy"
            onClick={handleCopyLink}
          >
            {copyState === 'copied'
              ? t('eventDetails.checkInPassCopied')
              : copyState === 'error'
                ? t('eventDetails.checkInPassCopyError')
                : t('eventDetails.checkInPassCopy')}
          </button>
        ) : null}
      </div>

      {passStatus === 'loading' ? (
        <p className="event-details-pass__message">{t('eventDetails.checkInPassLoading')}</p>
      ) : passStatus === 'error' ? (
        <p className="event-details-pass__message event-details-feedback--error">{passError}</p>
      ) : checkedInAt ? (
        <div className="event-details-pass__summary">
          <span className="event-details-pass__status">{t('eventDetails.checkedIn')}</span>
          <strong>{formatTimestamp(checkedInAt, languageCode)}</strong>
        </div>
      ) : qrStatus === 'loading' ? (
        <p className="event-details-pass__message">{t('eventDetails.checkInPassLoading')}</p>
      ) : (
        <div className="event-details-pass__body">
          <div
            className="event-details-pass__qr"
            aria-label={t('eventDetails.checkInPassQrLabel')}
            dangerouslySetInnerHTML={{ __html: qrMarkup }}
          />

          <div className="event-details-pass__notes">
            <p>{t('eventDetails.checkInPassHint')}</p>
            {qrStatus === 'error' ? (
              <p className="event-details-feedback--error">
                {t('eventDetails.checkInPassQrError')}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

export default EventCheckInPass
