import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  fetchAuthProviders,
  getDefaultRouteForRole,
  getGoogleClientId,
  warmUpBackend,
} from '../api/aemApi'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/auth.css'

const initialSignIn = { email: '', password: '' }
const initialSignUp = { fullName: '', email: '', password: '', confirmPassword: '' }
const GOOGLE_SCRIPT_ID = 'google-identity-services'

function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in is unavailable.'))
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google)
  }

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(window.google), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Google sign-in could not be loaded.')),
        { once: true },
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'))
    document.head.appendChild(script)
  })
}

function estimatePasswordStrength(password) {
  let score = 0

  if (password.length >= 8) score += 1
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1

  if (score <= 1) return 'weak'
  if (score === 2) return 'good'
  return 'strong'
}

function AuthPage({ onSignIn, onGoogleSignIn, onSignUp }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const googleButtonRef = useRef(null)
  const googleHandlerRef = useRef(null)
  const [mode, setMode] = useState('signin')
  const [signInData, setSignInData] = useState(initialSignIn)
  const [signUpData, setSignUpData] = useState(initialSignUp)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [authProvidersStatus, setAuthProvidersStatus] = useState('loading')
  const [googleBackendEnabled, setGoogleBackendEnabled] = useState(false)
  const [googleStatus, setGoogleStatus] = useState('idle')
  const googleClientId = getGoogleClientId()
  const googleClientConfigured = Boolean(googleClientId)
  const googleEnabled = Boolean(
    googleClientConfigured && googleBackendEnabled && typeof onGoogleSignIn === 'function',
  )

  const content = useMemo(
    () => ({
      signin: {
        eyebrow: t('auth.signinEyebrow'),
        title: t('auth.signinTitle'),
        helper: t('auth.signinHelper'),
        submitLabel: t('auth.signinSubmit'),
        footerPrompt: t('auth.signinFooterPrompt'),
        footerAction: t('auth.signinFooterAction'),
      },
      signup: {
        eyebrow: t('auth.signupEyebrow'),
        title: t('auth.signupTitle'),
        helper: t('auth.signupHelper'),
        submitLabel: t('auth.signupSubmit'),
        footerPrompt: t('auth.signupFooterPrompt'),
        footerAction: t('auth.signupFooterAction'),
      },
    })[mode],
    [mode, t],
  )

  const passwordStrength = useMemo(
    () => estimatePasswordStrength(signUpData.password),
    [signUpData.password],
  )

  const passwordRules = useMemo(
    () => [
      {
        label: t('auth.passwordRuleLength'),
        valid: signUpData.password.length >= 8,
      },
      {
        label: t('auth.passwordRuleLetter'),
        valid: /[A-Za-z]/.test(signUpData.password),
      },
      {
        label: t('auth.passwordRuleNumber'),
        valid: /\d/.test(signUpData.password),
      },
    ],
    [signUpData.password, t],
  )

  const passwordsMatch =
    signUpData.confirmPassword.length > 0 && signUpData.password === signUpData.confirmPassword

  useEffect(() => {
    let cancelled = false

    async function prepareAuthPage() {
      await warmUpBackend()

      try {
        const providers = await fetchAuthProviders()
        if (cancelled) {
          return
        }

        setGoogleBackendEnabled(Boolean(providers.google?.backendEnabled))
        setAuthProvidersStatus('ready')
      } catch {
        if (!cancelled) {
          setGoogleBackendEnabled(false)
          setAuthProvidersStatus('error')
        }
      }
    }

    prepareAuthPage()

    return () => {
      cancelled = true
    }
  }, [])

  googleHandlerRef.current = async (response) => {
    if (!response?.credential || typeof onGoogleSignIn !== 'function') {
      setFeedback({ type: 'error', message: t('auth.googleUnavailable') })
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: '', message: '' })
    await warmUpBackend()

    const result = await onGoogleSignIn(response.credential)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message || t('auth.googleUnavailable') })
      setIsSubmitting(false)
      return
    }

    const displayName = result.user.full_name ?? result.user.name ?? 'there'
    setFeedback({ type: 'success', message: t('auth.welcomeBack', { name: displayName }) })
    window.setTimeout(() => {
      setIsSubmitting(false)
      navigate(getDefaultRouteForRole(result.user.role))
    }, 500)
  }

  const googleHelperMessage = useMemo(() => {
    if (googleStatus === 'error') {
      return {
        tone: 'error',
        text: t('auth.googleUnavailable'),
      }
    }

    if (authProvidersStatus === 'loading' || googleStatus === 'loading') {
      return {
        tone: 'info',
        text: t('auth.googlePreparing'),
      }
    }

    if (!googleClientConfigured || !googleBackendEnabled || authProvidersStatus === 'error') {
      return {
        tone: 'info',
        text: t('auth.googleFallback'),
      }
    }

    return null
  }, [authProvidersStatus, googleBackendEnabled, googleClientConfigured, googleStatus, t])

  useEffect(() => {
    if (!googleEnabled || !googleButtonRef.current) {
      setGoogleStatus('idle')
      return undefined
    }

    let cancelled = false
    setGoogleStatus('loading')

    loadGoogleIdentityScript()
      .then((googleApi) => {
        if (cancelled || !googleButtonRef.current || !googleApi?.accounts?.id) {
          return
        }

        googleApi.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => googleHandlerRef.current?.(response),
          auto_select: false,
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
        })

        googleButtonRef.current.innerHTML = ''
        googleApi.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          width: Math.min(googleButtonRef.current.offsetWidth || 360, 360),
          logo_alignment: 'left',
        })
        setGoogleStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleStatus('error')
        }
      })

    return () => {
      cancelled = true
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = ''
      }
    }
  }, [googleClientId, googleEnabled, mode])

  function switchMode(nextMode) {
    setMode(nextMode)
    setFeedback({ type: '', message: '' })
  }

  function normalizeEmail(value) {
    return value.trim().toLowerCase()
  }

  function updateSignInField(field, value) {
    setSignInData((current) => ({ ...current, [field]: value }))
  }

  function updateSignUpField(field, value) {
    setSignUpData((current) => ({ ...current, [field]: value }))
  }

  async function handleSignInSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setFeedback({ type: '', message: '' })
    await warmUpBackend()

    const result = await onSignIn({
      ...signInData,
      email: normalizeEmail(signInData.email),
    })

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message })
      setIsSubmitting(false)
      return
    }

    const displayName = result.user.full_name ?? result.user.name ?? 'there'
    setFeedback({ type: 'success', message: t('auth.welcomeBack', { name: displayName }) })
    window.setTimeout(() => {
      setIsSubmitting(false)
      navigate(getDefaultRouteForRole(result.user.role))
    }, 500)
  }

  async function handleSignUpSubmit(event) {
    event.preventDefault()

    const normalizedData = {
      ...signUpData,
      fullName: signUpData.fullName.trim(),
      email: normalizeEmail(signUpData.email),
    }

    if (!normalizedData.fullName) {
      setFeedback({ type: 'error', message: t('auth.fullNameRequired') })
      return
    }

    if (normalizedData.password.length < 8) {
      setFeedback({ type: 'error', message: t('auth.passwordTooShort') })
      return
    }

    if (normalizedData.password !== normalizedData.confirmPassword) {
      setFeedback({ type: 'error', message: t('auth.passwordMismatch') })
      return
    }

    setIsSubmitting(true)
    setFeedback({ type: '', message: '' })
    await warmUpBackend()

    const result = await onSignUp(normalizedData)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message })
      setIsSubmitting(false)
      return
    }

    setFeedback({
      type: 'success',
      message: t('auth.welcomeBack', { name: normalizedData.fullName }),
    })

    window.setTimeout(() => {
      setSignUpData(initialSignUp)
      setSignInData(initialSignIn)
      setIsSubmitting(false)
      navigate(getDefaultRouteForRole(result.user.role))
    }, 500)
  }

  return (
    <section className="auth-page">
      <div className="auth-layout auth-layout--single">
        <div className="auth-card auth-card--standalone">
          <div className="auth-card__brand">
            <img className="auth-card__logo" src="/logo.png" alt={`${t('common.appName')} logo`} />
            <div className="auth-card__brand-copy">
              <p className="auth-card__brand-eyebrow">{t('auth.heroEyebrow')}</p>
              <strong>{t('common.appName')}</strong>
            </div>
          </div>

          <div className="auth-card__header">
            <div>
              <p className="auth-card__eyebrow">{content.eyebrow}</p>
              <h2>{content.title}</h2>
              <p className="auth-card__helper">{content.helper}</p>
            </div>

            <div className="auth-switcher" role="tablist" aria-label={t('auth.authModeLabel')}>
              <button
                type="button"
                className={
                  mode === 'signin'
                    ? 'auth-switcher__button auth-switcher__button--active'
                    : 'auth-switcher__button'
                }
                onClick={() => switchMode('signin')}
              >
                {t('auth.signinSubmit')}
              </button>
              <button
                type="button"
                className={
                  mode === 'signup'
                    ? 'auth-switcher__button auth-switcher__button--active'
                    : 'auth-switcher__button'
                }
                onClick={() => switchMode('signup')}
              >
                {t('auth.signupSubmit')}
              </button>
            </div>
          </div>

          <div className="auth-card__assist">
            <span>{t('auth.assistSecure')}</span>
            <span>{t('auth.assistFast')}</span>
            <span>{t('auth.assistPersonal')}</span>
          </div>

          {feedback.message ? (
            <div
              className={
                feedback.type === 'error'
                  ? 'auth-feedback auth-feedback--error'
                  : 'auth-feedback auth-feedback--success'
              }
              aria-live="polite"
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="auth-social">
            <div className="auth-social__divider">
              <span>{t('auth.googleDivider')}</span>
            </div>
            <div className="auth-social__button-shell">
              {googleEnabled && googleStatus === 'ready' ? (
                <div ref={googleButtonRef} className="auth-social__google-button" />
              ) : (
                <button
                  type="button"
                  className="auth-social__fallback-button"
                  disabled
                  aria-disabled="true"
                >
                  {authProvidersStatus === 'loading' || googleStatus === 'loading'
                    ? t('auth.googleLoading')
                    : t('auth.googleButton')}
                </button>
              )}
              {googleEnabled && googleStatus !== 'ready' ? (
                <div
                  ref={googleButtonRef}
                  className="auth-social__google-button auth-social__google-button--hidden"
                />
              ) : null}
            </div>
            {googleHelperMessage ? (
              <p
                className={
                  googleHelperMessage.tone === 'error'
                    ? 'auth-inline-note auth-inline-note--error'
                    : 'auth-inline-note'
                }
              >
                {googleHelperMessage.text}
              </p>
            ) : null}
          </div>

          {mode === 'signin' ? (
            <form className="auth-form" onSubmit={handleSignInSubmit}>
              <label>
                <span>{t('common.email')}</span>
                <input
                  type="email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  value={signInData.email}
                  onChange={(event) => updateSignInField('email', event.target.value)}
                  onBlur={(event) => updateSignInField('email', normalizeEmail(event.target.value))}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </label>

              <label>
                <span>{t('common.password')}</span>
                <div className="auth-password-field">
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    value={signInData.password}
                    onChange={(event) => updateSignInField('password', event.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-field__toggle"
                    disabled={isSubmitting}
                    onClick={() => setShowSignInPassword((current) => !current)}
                    aria-label={
                      showSignInPassword
                        ? `${t('common.hide')} ${t('common.password')}`
                        : `${t('common.show')} ${t('common.password')}`
                    }
                  >
                    {showSignInPassword ? t('common.hide') : t('common.show')}
                  </button>
                </div>
              </label>

              <button type="submit" className="auth-form__submit" disabled={isSubmitting}>
                {isSubmitting ? t('auth.signinSubmitting') : content.submitLabel}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignUpSubmit}>
              <label>
                <span>{t('common.fullName')}</span>
                <input
                  type="text"
                  autoComplete="name"
                  disabled={isSubmitting}
                  value={signUpData.fullName}
                  onChange={(event) => updateSignUpField('fullName', event.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  required
                />
              </label>

              <label>
                <span>{t('common.email')}</span>
                <input
                  type="email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  value={signUpData.email}
                  onChange={(event) => updateSignUpField('email', event.target.value)}
                  onBlur={(event) => updateSignUpField('email', normalizeEmail(event.target.value))}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </label>

              <label>
                <span>{t('common.password')}</span>
                <div className="auth-password-field">
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    value={signUpData.password}
                    onChange={(event) => updateSignUpField('password', event.target.value)}
                    placeholder={t('auth.passwordCreatePlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-field__toggle"
                    disabled={isSubmitting}
                    onClick={() => setShowSignUpPassword((current) => !current)}
                    aria-label={
                      showSignUpPassword
                        ? `${t('common.hide')} ${t('common.password')}`
                        : `${t('common.show')} ${t('common.password')}`
                    }
                  >
                    {showSignUpPassword ? t('common.hide') : t('common.show')}
                  </button>
                </div>
              </label>

              <div className="auth-password-meta">
                <div className="auth-strength">
                  <div className="auth-strength__bars" aria-hidden="true">
                    <span
                      className={
                        passwordStrength === 'weak' ||
                        passwordStrength === 'good' ||
                        passwordStrength === 'strong'
                          ? 'auth-strength__bar auth-strength__bar--active auth-strength__bar--weak'
                          : 'auth-strength__bar'
                      }
                    />
                    <span
                      className={
                        passwordStrength === 'good' || passwordStrength === 'strong'
                          ? 'auth-strength__bar auth-strength__bar--active auth-strength__bar--good'
                          : 'auth-strength__bar'
                      }
                    />
                    <span
                      className={
                        passwordStrength === 'strong'
                          ? 'auth-strength__bar auth-strength__bar--active auth-strength__bar--strong'
                          : 'auth-strength__bar'
                      }
                    />
                  </div>
                  <span className={`auth-strength__label auth-strength__label--${passwordStrength}`}>
                    {t(`auth.passwordStrength${passwordStrength[0].toUpperCase()}${passwordStrength.slice(1)}`)}
                  </span>
                </div>

                <ul className="auth-password-rules">
                  {passwordRules.map((rule) => (
                    <li
                      key={rule.label}
                      className={
                        rule.valid
                          ? 'auth-password-rules__item auth-password-rules__item--valid'
                          : 'auth-password-rules__item'
                      }
                    >
                      {rule.label}
                    </li>
                  ))}
                </ul>
              </div>

              <label>
                <span>{t('auth.confirmPasswordLabel')}</span>
                <div className="auth-password-field">
                  <input
                    type={showSignUpConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    value={signUpData.confirmPassword}
                    onChange={(event) => updateSignUpField('confirmPassword', event.target.value)}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-field__toggle"
                    disabled={isSubmitting}
                    onClick={() => setShowSignUpConfirmPassword((current) => !current)}
                    aria-label={
                      showSignUpConfirmPassword
                        ? `${t('common.hide')} ${t('auth.confirmPasswordLabel')}`
                        : `${t('common.show')} ${t('auth.confirmPasswordLabel')}`
                    }
                  >
                    {showSignUpConfirmPassword ? t('common.hide') : t('common.show')}
                  </button>
                </div>
                <span
                  className={
                    passwordsMatch
                      ? 'auth-inline-note auth-inline-note--success'
                      : signUpData.confirmPassword
                        ? 'auth-inline-note auth-inline-note--error'
                        : 'auth-inline-note'
                  }
                >
                  {passwordsMatch
                    ? t('auth.passwordMatch')
                    : signUpData.confirmPassword
                      ? t('auth.passwordMismatch')
                      : t('auth.confirmPasswordHint')}
                </span>
              </label>

              <button type="submit" className="auth-form__submit" disabled={isSubmitting}>
                {isSubmitting ? t('auth.signupSubmitting') : content.submitLabel}
              </button>
            </form>
          )}

          <div className="auth-card__footer">
            <span>{content.footerPrompt}</span>
            <button
              type="button"
              className="auth-card__footer-link"
              disabled={isSubmitting}
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {content.footerAction}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AuthPage
