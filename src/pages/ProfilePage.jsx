import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  isSupabaseUploadConfigured,
  uploadProfileImageToSupabase,
} from '../api/aemApi'
import { useI18n } from '../i18n/LanguageContext'
import { getLanguageLocale } from '../i18n/translations'
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
    return 'user'
  }

  return role.toLowerCase()
}

function ProfilePage({ currentUser, onUpdateProfile, onLogout }) {
  const { languageCode, t } = useI18n()
  const navigate = useNavigate()
  const [formData, setFormData] = useState(() => buildFormData(currentUser))
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const fileInputRef = useRef(null)

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
    ? new Date(currentUser.createdAt).toLocaleDateString(getLanguageLocale(languageCode), {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : t('common.tbd')

  const roleValue = formatRole(currentUser?.role)
  const roleLabel =
    roleValue === 'student'
      ? t('common.defaultStudent')
      : roleValue === 'organizer'
        ? t('common.organizer')
        : roleValue === 'admin'
          ? languageCode === 'ru'
            ? 'Админ'
            : languageCode === 'uz'
              ? 'Admin'
              : 'Admin'
          : languageCode === 'ru'
            ? 'Пользователь'
            : languageCode === 'uz'
              ? 'Foydalanuvchi'
              : 'User'

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  async function handlePhotoUpload(event) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    setIsUploadingPhoto(true)
    setFeedback({ type: '', message: '' })

    try {
      const uploadedImageUrl = await uploadProfileImageToSupabase(selectedFile, currentUser?.id)
      updateField('profileImageUrl', uploadedImageUrl)
      setFeedback({
        type: 'success',
        message: t('profile.photoUploaded'),
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('profile.uploadPhotoError'),
      })
    } finally {
      setIsUploadingPhoto(false)
      event.target.value = ''
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isUploadingPhoto) {
      return
    }

    setIsSaving(true)
    setFeedback({ type: '', message: '' })

    try {
      const result = await onUpdateProfile(formData)
      setFormData(buildFormData(result.user))
      setFeedback({ type: 'success', message: t('profile.profileUpdated') })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('profile.updateProfileError'),
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
              <img src={previewImageUrl} alt={`${currentUser?.name ?? 'User'} ${t('header.profile')}`} />
            ) : (
              profileInitials
            )}
          </div>
          <div className="profile-page__copy">
            <p className="profile-page__eyebrow">{t('profile.accountOverview')}</p>
            <h1>{currentUser?.name ?? t('header.profile')}</h1>
            <p>{currentUser?.email ?? t('common.noEmail')}</p>
          </div>
        </div>

        <div className="profile-page__meta">
          <div className="profile-page__meta-card">
            <span>{t('common.role')}</span>
            <strong>{roleLabel}</strong>
          </div>
          <div className="profile-page__meta-card">
            <span>{t('common.createdEvents')}</span>
            <strong>{currentUser?.createdEventsCount ?? 0}</strong>
          </div>
          <div className="profile-page__meta-card">
            <span>{t('common.joinedEvents')}</span>
            <strong>{currentUser?.joinedEventsCount ?? 0}</strong>
          </div>
          <div className="profile-page__meta-card">
            <span>{t('common.memberSince')}</span>
            <strong>{memberSince}</strong>
          </div>
        </div>
      </div>

      <div className="profile-page__grid">
        <article className="profile-card">
          <div className="profile-card__header">
            <div>
              <p className="profile-card__eyebrow">{t('profile.personalInfo')}</p>
              <h2>{t('profile.profileSettings')}</h2>
            </div>
            <button
              type="button"
              className="profile-card__logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? t('common.signingOut') : t('common.signOut')}
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
              {t('common.fullName')}
              <input
                type="text"
                value={formData.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                disabled={isSaving || isUploadingPhoto}
              />
            </label>

            <label>
              {t('common.email')}
              <input type="email" value={currentUser?.email ?? ''} disabled />
            </label>

            <label>
              {t('common.profileImageUrl')}
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={formData.profileImageUrl}
                onChange={(event) => updateField('profileImageUrl', event.target.value)}
                disabled={isSaving || isUploadingPhoto}
              />
            </label>

            <div className="profile-form__photo-tools">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="profile-form__file-input"
                onChange={handlePhotoUpload}
                disabled={isSaving || isUploadingPhoto || !isSupabaseUploadConfigured()}
              />
              <button
                type="button"
                className="profile-form__secondary"
                onClick={openFilePicker}
                disabled={isSaving || isUploadingPhoto || !isSupabaseUploadConfigured()}
              >
                {isUploadingPhoto ? t('profile.uploading') : t('profile.uploadFromDevice')}
              </button>
              <button
                type="button"
                className="profile-form__ghost"
                onClick={() => updateField('profileImageUrl', '')}
                disabled={isSaving || isUploadingPhoto || !formData.profileImageUrl}
              >
                {t('common.removePhoto')}
              </button>
            </div>

            <p className="profile-form__hint">
              {isSupabaseUploadConfigured()
                ? t('profile.photoHintConfigured')
                : t('profile.photoHintFallback')}
            </p>

            <label>
              {t('common.theme')}
              <select
                value={formData.theme}
                onChange={(event) => updateField('theme', event.target.value)}
                disabled={isSaving || isUploadingPhoto}
              >
                <option value="light">{t('profile.light')}</option>
                <option value="dark">{t('profile.dark')}</option>
              </select>
            </label>

            <label>
              {t('common.language')}
              <select
                value={formData.languageCode}
                onChange={(event) => updateField('languageCode', event.target.value)}
                disabled={isSaving || isUploadingPhoto}
              >
                <option value="en">{t('profile.english')}</option>
                <option value="ru">{t('profile.russian')}</option>
                <option value="uz">{t('profile.uzbek')}</option>
              </select>
            </label>

            <label className="profile-form__toggle">
              <input
                type="checkbox"
                checked={formData.notificationsEnabled}
                onChange={(event) => updateField('notificationsEnabled', event.target.checked)}
                disabled={isSaving || isUploadingPhoto}
              />
              <span>{t('common.notifications')}</span>
            </label>

            <div className="profile-form__actions">
              <button
                type="submit"
                className="profile-form__primary"
                disabled={isSaving || isUploadingPhoto}
              >
                {isSaving ? t('common.saving') : t('common.saveChanges')}
              </button>
            </div>
          </form>
        </article>

        <article className="profile-card profile-card--info">
          <p className="profile-card__eyebrow">{t('profile.accountOverview')}</p>
          <h2>{t('profile.whatYouCanDo')}</h2>
          <ul className="profile-card__list">
            <li>{t('profile.itemName')}</li>
            <li>{t('profile.itemPhoto')}</li>
            <li>{t('profile.itemTheme')}</li>
            <li>{t('profile.itemLanguage')}</li>
            <li>{t('profile.itemNotifications')}</li>
          </ul>
          <p className="profile-card__note">{t('profile.aboutNote')}</p>
        </article>
      </div>
    </section>
  )
}

export default ProfilePage
