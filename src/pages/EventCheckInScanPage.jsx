import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  buildCheckInResultPath,
  extractCheckInToken,
  fetchEventById,
} from '../api/aemApi'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/checkin.css'

function EventCheckInScanPage({ currentUser }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { eventId } = useParams()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const scanIntervalRef = useRef(0)
  const isDetectingRef = useRef(false)
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [scannerStatus, setScannerStatus] = useState('idle')
  const [scannerError, setScannerError] = useState('')
  const [manualValue, setManualValue] = useState('')
  const [manualError, setManualError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadEvent() {
      setStatus('loading')
      setErrorMessage('')

      try {
        const fetchedEvent = await fetchEventById(eventId)
        if (!isMounted) {
          return
        }

        setEvent(fetchedEvent)
        setStatus('ready')
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (error.status === 404) {
          setStatus('not-found')
          return
        }

        setErrorMessage(error.message || t('checkInScan.loadError'))
        setStatus('error')
      }
    }

    loadEvent()

    return () => {
      isMounted = false
    }
  }, [eventId, t])

  useEffect(() => {
    return () => {
      window.clearInterval(scanIntervalRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  function stopScanner() {
    window.clearInterval(scanIntervalRef.current)
    scanIntervalRef.current = 0
    detectorRef.current = null
    isDetectingRef.current = false

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setScannerStatus('idle')
  }

  function handleResolvedScan(rawValue) {
    const token = extractCheckInToken(rawValue)
    if (!token) {
      setScannerError(t('checkInScan.invalidQr'))
      return
    }

    stopScanner()
    navigate(buildCheckInResultPath(eventId, token))
  }

  async function handleStartScanner() {
    setScannerError('')

    if (!window.BarcodeDetector) {
      setScannerError(t('checkInScan.cameraUnsupported'))
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError(t('checkInScan.cameraUnsupported'))
      return
    }

    try {
      if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats()
        if (!supportedFormats.includes('qr_code')) {
          setScannerError(t('checkInScan.cameraUnsupported'))
          return
        }
      }

      setScannerStatus('starting')
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      scanIntervalRef.current = window.setInterval(async () => {
        if (isDetectingRef.current || !videoRef.current || !detectorRef.current) {
          return
        }

        if (videoRef.current.readyState < 2) {
          return
        }

        isDetectingRef.current = true

        try {
          const detectedCodes = await detectorRef.current.detect(videoRef.current)
          const rawValue = detectedCodes[0]?.rawValue?.trim()
          if (rawValue) {
            handleResolvedScan(rawValue)
          }
        } catch {
          // Ignore transient detection errors while the camera is running.
        } finally {
          isDetectingRef.current = false
        }
      }, 650)

      setScannerStatus('scanning')
    } catch (error) {
      stopScanner()
      setScannerError(error.message || t('checkInScan.cameraError'))
    }
  }

  function handleManualSubmit(submitEvent) {
    submitEvent.preventDefault()
    const token = extractCheckInToken(manualValue)

    if (!token) {
      setManualError(t('checkInScan.manualError'))
      return
    }

    setManualError('')
    navigate(buildCheckInResultPath(eventId, token))
  }

  if (status === 'loading') {
    return (
      <section className="page check-in-page">
        <article className="route-card">
          <h2>{t('checkInScan.loadingTitle')}</h2>
          <p>{t('checkInScan.loadingDescription')}</p>
        </article>
      </section>
    )
  }

  if (status === 'not-found') {
    return (
      <section className="page check-in-page">
        <article className="route-card">
          <h2>{t('checkInScan.notFoundTitle')}</h2>
          <p>{t('checkInScan.notFoundDescription')}</p>
          <Link to="/students" className="button button--primary">
            {t('checkInScan.backToEvents')}
          </Link>
        </article>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="page check-in-page">
        <article className="route-card">
          <h2>{t('checkInScan.errorTitle')}</h2>
          <p>{errorMessage}</p>
          <Link to={`/events/${eventId}`} className="button button--primary">
            {t('checkInScan.backToEvent')}
          </Link>
        </article>
      </section>
    )
  }

  const canManageCheckIn =
    Boolean(currentUser?.id) &&
    Boolean(event) &&
    (currentUser.role === 'admin' || currentUser.id === event.creatorId)

  if (!canManageCheckIn) {
    return (
      <section className="page check-in-page">
        <article className="route-card">
          <h2>{t('checkInScan.forbiddenTitle')}</h2>
          <p>{t('checkInScan.forbiddenDescription')}</p>
          <Link to={`/events/${eventId}`} className="button button--primary">
            {t('checkInScan.backToEvent')}
          </Link>
        </article>
      </section>
    )
  }

  return (
    <section className="page check-in-page">
      <div className="page-intro">
        <div>
          <p className="page__eyebrow">{t('checkInScan.eyebrow')}</p>
          <h1>{t('checkInScan.title')}</h1>
          <p className="page__lead">{t('checkInScan.subtitle', { title: event.title })}</p>
        </div>

        <Link to={`/events/${eventId}`} className="button button--primary">
          {t('checkInScan.backToEvent')}
        </Link>
      </div>

      <div className="check-in-grid">
        <article className="route-card check-in-card">
          <div className="check-in-card__top">
            <div>
              <h2>{t('checkInScan.cameraTitle')}</h2>
              <p>{t('checkInScan.cameraDescription')}</p>
            </div>

            {scannerStatus === 'scanning' || scannerStatus === 'starting' ? (
              <button
                type="button"
                className="button check-in-card__button"
                onClick={stopScanner}
              >
                {t('checkInScan.stopScanner')}
              </button>
            ) : (
              <button
                type="button"
                className="button button--primary"
                onClick={handleStartScanner}
              >
                {t('checkInScan.startScanner')}
              </button>
            )}
          </div>

          <div className="check-in-scanner">
            <div className="check-in-scanner__frame">
              <video
                ref={videoRef}
                className="check-in-scanner__video"
                muted
                playsInline
              />
              {scannerStatus !== 'scanning' ? (
                <div className="check-in-scanner__placeholder">
                  <strong>{t('checkInScan.cameraPlaceholderTitle')}</strong>
                  <span>{t('checkInScan.cameraPlaceholderDescription')}</span>
                </div>
              ) : null}
            </div>

            <p className="check-in-scanner__hint">
              {scannerStatus === 'scanning'
                ? t('checkInScan.scanningHint')
                : t('checkInScan.cameraHint')}
            </p>

            {scannerError ? (
              <p className="check-in-page__feedback check-in-page__feedback--error">
                {scannerError}
              </p>
            ) : null}
          </div>
        </article>

        <article className="route-card check-in-card">
          <div className="check-in-card__top">
            <div>
              <h2>{t('checkInScan.manualTitle')}</h2>
              <p>{t('checkInScan.manualDescription')}</p>
            </div>
          </div>

          <form className="check-in-form" onSubmit={handleManualSubmit}>
            <label className="check-in-form__field">
              <span>{t('checkInScan.manualLabel')}</span>
              <textarea
                rows="4"
                value={manualValue}
                onChange={(changeEvent) => setManualValue(changeEvent.target.value)}
                placeholder={t('checkInScan.manualPlaceholder')}
              />
            </label>

            {manualError ? (
              <p className="check-in-page__feedback check-in-page__feedback--error">
                {manualError}
              </p>
            ) : null}

            <button type="submit" className="button button--primary">
              {t('checkInScan.manualSubmit')}
            </button>
          </form>
        </article>
      </div>
    </section>
  )
}

export default EventCheckInScanPage
