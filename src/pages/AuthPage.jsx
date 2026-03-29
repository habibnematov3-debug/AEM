import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../styles/auth.css'

const initialSignIn = { email: '', password: '' }
const initialSignUp = { fullName: '', email: '', password: '' }

function AuthPage({ demoAccount, onSignIn, onSignUp }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [signInData, setSignInData] = useState(initialSignIn)
  const [signUpData, setSignUpData] = useState(initialSignUp)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const helperText = useMemo(() => {
    if (mode === 'signin') {
      return 'Sign in with the local mock account to open the student events page.'
    }

    return 'Create a local mock account for the MVP. No backend or real authentication is used.'
  }, [mode])

  function switchMode(nextMode) {
    setMode(nextMode)
    setFeedback({ type: '', message: '' })
  }

  function handleSignInSubmit(event) {
    event.preventDefault()

    const result = onSignIn(signInData)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message })
      return
    }

    setFeedback({ type: 'success', message: `Welcome back, ${result.user.name}. Redirecting...` })
    window.setTimeout(() => navigate('/students'), 500)
  }

  function handleSignUpSubmit(event) {
    event.preventDefault()

    const result = onSignUp(signUpData)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.message })
      return
    }

    setMode('signin')
    setSignInData({ email: result.user.email, password: signUpData.password })
    setSignUpData(initialSignUp)
    setFeedback({
      type: 'success',
      message: 'Mock account created. Sign in now to continue.',
    })
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <img className="auth-card__logo" src="/logo.png" alt="AEM logo" />
          <p className="auth-card__subtitle">Academic Event Manager</p>
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

        <p className="auth-card__helper">{helperText}</p>

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
              Email
              <input
                type="email"
                value={signInData.email}
                onChange={(event) =>
                  setSignInData((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="your.name@ajou.uz"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={signInData.password}
                onChange={(event) =>
                  setSignInData((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Enter password"
                required
              />
            </label>

            <button type="submit" className="auth-form__submit">
              Sign In
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignUpSubmit}>
            <label>
              Full name
              <input
                type="text"
                value={signUpData.fullName}
                onChange={(event) =>
                  setSignUpData((current) => ({ ...current, fullName: event.target.value }))
                }
                placeholder="Your full name"
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={signUpData.email}
                onChange={(event) =>
                  setSignUpData((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="your.name@ajou.uz"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={signUpData.password}
                onChange={(event) =>
                  setSignUpData((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Create password"
                required
              />
            </label>

            <button type="submit" className="auth-form__submit">
              Create Account
            </button>
          </form>
        )}

        {demoAccount ? (
          <p className="auth-card__note">
            Mock login: {demoAccount.email} / {demoAccount.password}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default AuthPage
