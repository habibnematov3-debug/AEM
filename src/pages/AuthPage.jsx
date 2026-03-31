import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useI18n } from '../i18n/LanguageContext'
import '../styles/auth.css'

const initialSignIn = { email: '', password: '' }
const initialSignUp = { fullName: '', email: '', password: '' }

function AuthPage({ onSignIn, onSignUp }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [signInData, setSignInData] = useState(initialSignIn)
  const [signUpData, setSignUpData] = useState(initialSignUp)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

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

  function switchMode(nextMode) {
    setMode(nextMode)
    setFeedback({ type: '', message: '' })
  }

  async function handleSignInSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    const result = await onSignIn(signInData)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message })
      setIsSubmitting(false)
      return
    }

    const displayName = result.user.full_name ?? result.user.name ?? 'there'
    setFeedback({ type: 'success', message: t('auth.welcomeBack', { name: displayName }) })
    window.setTimeout(() => {
      setIsSubmitting(false)
      navigate('/students')
    }, 500)
  }

  async function handleSignUpSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    const result = await onSignUp(signUpData)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message })
      setIsSubmitting(false)
      return
    }

    setMode('signin')
    setSignInData({ email: result.user.email, password: signUpData.password })
    setSignUpData(initialSignUp)
    setFeedback({
      type: 'success',
      message: t('auth.accountCreated'),
    })
    setIsSubmitting(false)
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

          {feedback.message ? (
            <div
              className={
                feedback.type === 'error'
                  ? 'auth-feedback auth-feedback--error'
                  : 'auth-feedback auth-feedback--success'
              }
            >
              {feedback.message}
            </div>
          ) : null}

          {mode === 'signin' ? (
            <form className="auth-form" onSubmit={handleSignInSubmit}>
              <label>
                <span>{t('common.email')}</span>
                  <input
                    type="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    value={signInData.email}
                  onChange={(event) =>
                    setSignInData((current) => ({ ...current, email: event.target.value }))
                  }
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
                    onChange={(event) =>
                      setSignInData((current) => ({ ...current, password: event.target.value }))
                    }
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
                  onChange={(event) =>
                    setSignUpData((current) => ({ ...current, fullName: event.target.value }))
                  }
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
                  onChange={(event) =>
                    setSignUpData((current) => ({ ...current, email: event.target.value }))
                  }
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
                    onChange={(event) =>
                      setSignUpData((current) => ({ ...current, password: event.target.value }))
                    }
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
