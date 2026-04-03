import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import {
  checkInParticipantByToken,
  extractCheckInToken,
} from '../api/aemApi'
import { useI18n } from '../i18n/LanguageContext'
import { getLanguageLocale } from '../i18n/translations'
import '../styles/checkin.css'

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

function EventCheckInResultPage() {
  const { languageCode, t } = useI18n()
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const rawToken = searchParams.get('token') ?? ''
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    let isMounted = true
    const token = extractCheckInToken(rawToken)

    async function redeemToken() {
      if (!token) {
        setStatus('missing')
        return
      }

      setStatus('loading')
      setErrorMessage('')

      try {
        const payload = await checkInParticipantByToken(eventId, token)
        if (!isMounted) {
          return
        }

        setResult(payload)
        setStatus('success')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(error.message || t('checkInResult.errorDescription'))
        setStatus('error')
      }
    }

    redeemToken()

    return () => {
      isMounted = false
    }
  }, [eventId, rawToken, t])

  return (
    <section className="page check-in-page">
      <div className="page-intro">
        <div>
          <p className="page__eyebrow">{t('checkInResult.eyebrow')}</p>
          <h1>{t('checkInResult.title')}</h1>
          <p className="page__lead">{t('checkInResult.subtitle')}</p>
        </div>

        <Link to={`/events/${eventId}/check-in`} className="button button--primary">
          {t('checkInResult.backToScanner')}
        </Link>
      </div>

      <article className="route-card check-in-result-card">
        {status === 'loading' ? (
          <>
            <h2>{t('checkInResult.loadingTitle')}</h2>
            <p>{t('checkInResult.loadingDescription')}</p>
          </>
        ) : null}

        {status === 'missing' ? (
          <>
            <h2>{t('checkInResult.missingTitle')}</h2>
            <p>{t('checkInResult.missingDescription')}</p>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <span className="check-in-result-card__badge check-in-result-card__badge--error">
              {t('checkInResult.errorBadge')}
            </span>
            <h2>{t('checkInResult.errorTitle')}</h2>
            <p>{errorMessage}</p>
          </>
        ) : null}

        {status === 'success' && result ? (
          <>
            <span className="check-in-result-card__badge">
              {t('checkInResult.successBadge')}
            </span>
            <h2>{result.participation.userName || t('checkInResult.successTitle')}</h2>
            <p>{result.participation.email || result.event.title}</p>

            <dl className="check-in-result-card__meta">
              <div>
                <dt>{t('checkInResult.metaEvent')}</dt>
                <dd>{result.event.title}</dd>
              </div>
              <div>
                <dt>{t('checkInResult.metaStatus')}</dt>
                <dd>{t('eventDetails.checkedIn')}</dd>
              </div>
              <div>
                <dt>{t('checkInResult.metaTime')}</dt>
                <dd>{formatTimestamp(result.participation.checkedInAt, languageCode)}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </article>
    </section>
  )
}

export default EventCheckInResultPage
