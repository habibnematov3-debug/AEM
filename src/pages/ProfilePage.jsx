import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../styles/profile.css'

function buildFormData(currentUser) {
  return {
    fullName: currentUser?.name ?? '',
    theme: currentUser?.settings?.theme ?? 'light',
    languageCode: currentUser?.settings?.languageCode ?? 'en',
    notificationsEnabled: currentUser?.settings?.notificationsEnabled ?? true,
    profileImageUrl: currentUser?.profileImageUrl ?? currentUser?.settings?.profileImageUrl ?? '',
  }
}

function formatRole(role) {
  if (!role) {
    return 'User'
  }

  return role.charAt(0).toUpperCase() + role.slice(1)
}

function ProfilePage({ currentUser, onUpdateProfile, onLogout }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(() => buildFormData(currentUser))
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  useEffect(() => {
    setFormData(buildFormData(currentUser))
  }, [currentUser])

  const profileInitials = useMemo(() => {
    const source = currentUser?.name?.trim() ?? ''
    if (!source) {
      return '?'
    }

    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  }, [currentUser])

  const previewImageUrl = formData.profileImageUrl?.trim() || ''

  const memberSince = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown'

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setFeedback({ type: '', message: '' })

    try {
      const result = await onUpdateProfile(formData)
      setFormData(buildFormData(result.user))
      setFeedback({ type: 'success', message: result.message })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Could not update the profile.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await onLogout()
      navigate('/')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-page__hero">
        <div className="profile-page__identity">
          <div className="profile-page__avatar">
            {previewImageUrl ? (
              <img src={previewImageUrl} alt={`${currentUser?.name ?? 'User'} profile`} />
            ) : (
              profileInitials
            )}
          </div>
          <div className="profile-page__copy">
            <p className="profile-page__eyebrow">Account overview</p>
            <h1>{currentUser?.name ?? 'Profile'}</h1>
            <p>{currentUser?.email ?? 'No email available'}</p>
          </div>
        </div>

        <div className="profile-page__meta">
          <div className="profile-page__meta-card">
            <span>Role</span>
            <strong>{formatRole(currentUser?.role)}</strong>
          </div>
          <div className="profile-page__meta-card">
            <span>Created Events</span>
            <strong>{currentUser?.createdEventsCount ?? 0}</strong>
          </div>
          <div className="profile-page__meta-card">
            <span>Joined Events</span>
            <strong>{currentUser?.joinedEventsCount ?? 0}</strong>
          </div>
          <div className="profile-page__meta-card">
            <span>Member Since</span>
            <strong>{memberSince}</strong>
          </div>
        </div>
      </div>

      <div className="profile-page__grid">
        <article className="profile-card">
          <div className="profile-card__header">
            <div>
              <p className="profile-card__eyebrow">Personal Info</p>
              <h2>Profile settings</h2>
            </div>
            <button
              type="button"
              className="profile-card__logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>

          {feedback.message ? (
            <div
              className={
                feedback.type === 'error'
                  ? 'profile-card__feedback profile-card__feedback--error'
                  : 'profile-card__feedback profile-card__feedback--success'
              }
            >
              {feedback.message}
            </div>
          ) : null}

          <form className="profile-form" onSubmit={handleSubmit}>
            <label>
              Full Name
              <input
                type="text"
                value={formData.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                disabled={isSaving}
              />
            </label>

            <label>
              Email
              <input type="email" value={currentUser?.email ?? ''} disabled />
            </label>

            <label>
              Profile Image URL
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={formData.profileImageUrl}
                onChange={(event) => updateField('profileImageUrl', event.target.value)}
                disabled={isSaving}
              />
            </label>

            <label>
              Theme
              <select
                value={formData.theme}
                onChange={(event) => updateField('theme', event.target.value)}
                disabled={isSaving}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>

            <label>
              Interface Language
              <select
                value={formData.languageCode}
                onChange={(event) => updateField('languageCode', event.target.value)}
                disabled={isSaving}
              >
                <option value="en">English</option>
                <option value="ru">Russian</option>
                <option value="uz">Uzbek</option>
              </select>
            </label>

            <label className="profile-form__toggle">
              <input
                type="checkbox"
                checked={formData.notificationsEnabled}
                onChange={(event) => updateField('notificationsEnabled', event.target.checked)}
                disabled={isSaving}
              />
              <span>Email Notifications</span>
            </label>

            <div className="profile-form__actions">
              <button type="submit" className="profile-form__primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </article>

        <article className="profile-card profile-card--info">
          <p className="profile-card__eyebrow">About this profile</p>
          <h2>What you can do here</h2>
          <ul className="profile-card__list">
            <li>Update your full name</li>
            <li>Set a profile photo from a direct image URL</li>
            <li>Switch between light and dark mode</li>
            <li>Choose your preferred interface language</li>
            <li>Control whether notifications are enabled</li>
          </ul>
          <p className="profile-card__note">
            For now, profile photos use a direct image URL to keep the app fast and stable.
          </p>
        </article>
      </div>
    </section>
  )
}

export default ProfilePage
