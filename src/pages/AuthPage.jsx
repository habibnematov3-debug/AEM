import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../styles/auth.css'

const initialSignIn = { email: '', password: '' }
const initialSignUp = { fullName: '', email: '', password: '' }

const modeContent = {
  signin: {
    eyebrow: 'Welcome Back',
    title: 'Sign in to your AEM account',
    helper: 'Access university events, your activity, and organizer tools from one place.',
    submitLabel: 'Sign In',
    footerPrompt: "Don't have an account?",
    footerAction: 'Create one',
  },
  signup: {
    eyebrow: 'Create Account',
    title: 'Join AEM and get started',
    helper: 'Use your university email to discover events, participate, or manage your own.',
    submitLabel: 'Create Account',
    footerPrompt: 'Already have an account?',
    footerAction: 'Sign in',
  },
}

function AuthPage({ onSignIn, onSignUp }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [signInData, setSignInData] = useState(initialSignIn)
  const [signUpData, setSignUpData] = useState(initialSignUp)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const content = useMemo(() => modeContent[mode], [mode])

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
    setFeedback({ type: 'success', message: `Welcome back, ${displayName}. Redirecting...` })
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
      message: 'Account created successfully. Sign in to continue.',
    })
    setIsSubmitting(false)
  }

  return (
    <section className="auth-page">
      <div className="auth-layout">
        <aside className="auth-hero">
          <div className="auth-hero__brand">
            <img className="auth-hero__logo" src="/logo.png" alt="AEM logo" />
            <div className="auth-hero__copy">
              <p className="auth-hero__eyebrow">Academic Event Manager</p>
              <h1>One place for student events, organizers, and campus activity.</h1>
              <p>
                AEM helps your university community discover events faster and manage them
                with less friction.
              </p>
            </div>
          </div>

          <div className="auth-hero__highlights">
            <article className="auth-highlight">
              <span className="auth-highlight__index">01</span>
              <div>
                <strong>Discover</strong>
                <p>Browse upcoming university events in a clean, centralized space.</p>
              </div>
            </article>
            <article className="auth-highlight">
              <span className="auth-highlight__index">02</span>
              <div>
                <strong>Manage</strong>
                <p>Create, edit, and organize events with a simple dashboard workflow.</p>
              </div>
            </article>
            <article className="auth-highlight">
              <span className="auth-highlight__index">03</span>
              <div>
                <strong>Participate</strong>
                <p>Keep sign-in and event activity tied to each user account.</p>
              </div>
            </article>
          </div>
        </aside>

        <div className="auth-card">
          <div className="auth-card__header">
            <div>
              <p className="auth-card__eyebrow">{content.eyebrow}</p>
              <h2>{content.title}</h2>
              <p className="auth-card__helper">{content.helper}</p>
            </div>

            <div className="auth-switcher" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                className={
                  mode === 'signin'
                    ? 'auth-switcher__button auth-switcher__button--active'
                    : 'auth-switcher__button'
                }
                onClick={() => switchMode('signin')}
              >
                Sign In
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
                Sign Up
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
                <span>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    value={signInData.email}
                  onChange={(event) =>
                    setSignInData((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="your.name@ajou.uz"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <div className="auth-password-field">
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    value={signInData.password}
                    onChange={(event) =>
                      setSignInData((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-field__toggle"
                    disabled={isSubmitting}
                    onClick={() => setShowSignInPassword((current) => !current)}
                    aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignInPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <button type="submit" className="auth-form__submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing In...' : content.submitLabel}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignUpSubmit}>
              <label>
                <span>Full Name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    disabled={isSubmitting}
                    value={signUpData.fullName}
                  onChange={(event) =>
                    setSignUpData((current) => ({ ...current, fullName: event.target.value }))
                  }
                  placeholder="Your full name"
                  required
                />
              </label>

              <label>
                <span>Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    value={signUpData.email}
                  onChange={(event) =>
                    setSignUpData((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="your.name@ajou.uz"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <div className="auth-password-field">
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    value={signUpData.password}
                    onChange={(event) =>
                      setSignUpData((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Create a secure password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-field__toggle"
                    disabled={isSubmitting}
                    onClick={() => setShowSignUpPassword((current) => !current)}
                    aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignUpPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <button type="submit" className="auth-form__submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : content.submitLabel}
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
