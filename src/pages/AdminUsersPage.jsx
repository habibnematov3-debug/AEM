import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchAdminUsers, updateAdminUser } from '../api/aemApi'
import { getLanguageLocale } from '../i18n/translations'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/admin-users.css'

function formatMemberDate(value, languageCode) {
  if (!value) {
    return '—'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString(getLanguageLocale(languageCode), {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatLastActive(value, languageCode, fallback) {
  if (!value) {
    return fallback
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleString(getLanguageLocale(languageCode), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function AdminUsersPage({ currentUser }) {
  const { languageCode, t } = useI18n()
  const [roleFilter, setRoleFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [updatingUserId, setUpdatingUserId] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadUsers() {
      setIsLoading(true)
      setFeedback({ type: '', message: '' })

      try {
        const nextUsers = await fetchAdminUsers({
          role: roleFilter === 'all' ? '' : roleFilter,
          query: searchQuery,
          isActive: activityFilter === 'all' ? '' : activityFilter === 'active',
        })

        if (!isMounted) {
          return
        }

        setUsers(nextUsers)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setFeedback({ type: 'error', message: error.message || t('adminUsersPage.loadError') })
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      isMounted = false
    }
  }, [activityFilter, roleFilter, searchQuery, t])

  const roleFilters = useMemo(() => ['all', 'admin', 'student'], [])
  const activityFilters = useMemo(() => ['all', 'active', 'inactive'], [])

  function getRoleLabel(role) {
    return role === 'admin' ? t('adminUsersPage.roles.admin') : t('adminUsersPage.roles.student')
  }

  async function handleRoleChange(userId, role) {
    setUpdatingUserId(userId)
    setFeedback({ type: '', message: '' })

    try {
      const result = await updateAdminUser(userId, { role })
      setUsers((currentUsers) => {
        const nextUsers = currentUsers.map((user) => (user.id === result.user.id ? result.user : user))
        const roleMismatch = roleFilter !== 'all' && roleFilter !== result.user.role
        const activityMismatch =
          activityFilter !== 'all'
          && (activityFilter === 'active') !== result.user.isActive

        if (roleMismatch || activityMismatch) {
          return nextUsers.filter((user) => user.id !== result.user.id)
        }

        return nextUsers
      })
      setFeedback({ type: 'success', message: t('adminUsersPage.roleUpdated') })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || t('adminUsersPage.updateError') })
    } finally {
      setUpdatingUserId('')
    }
  }

  async function handleToggleActive(user) {
    setUpdatingUserId(user.id)
    setFeedback({ type: '', message: '' })

    try {
      const result = await updateAdminUser(user.id, { is_active: !user.isActive })
      setUsers((currentUsers) => {
        const nextUsers = currentUsers.map((current) => (current.id === result.user.id ? result.user : current))
        const roleMismatch = roleFilter !== 'all' && roleFilter !== result.user.role
        const activityMismatch =
          activityFilter !== 'all'
          && (activityFilter === 'active') !== result.user.isActive

        if (roleMismatch || activityMismatch) {
          return nextUsers.filter((current) => current.id !== result.user.id)
        }

        return nextUsers
      })
      setFeedback({ type: 'success', message: t('adminUsersPage.statusUpdated') })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || t('adminUsersPage.updateError') })
    } finally {
      setUpdatingUserId('')
    }
  }

  return (
    <section className="admin-users-page">
      <div className="admin-users-page__intro">
        <div>
          <p className="admin-users-page__eyebrow">{t('adminUsersPage.eyebrow')}</p>
          <h1>{t('adminUsersPage.title')}</h1>
          <p>{t('adminUsersPage.subtitle')}</p>
        </div>

        <Link to="/admin" className="admin-users-page__back-link">
          {t('adminUsersPage.backToDashboard')}
        </Link>
      </div>

      {feedback.message ? (
        <div
          className={
            feedback.type === 'error'
              ? 'admin-users-page__feedback admin-users-page__feedback--error'
              : 'admin-users-page__feedback admin-users-page__feedback--success'
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="admin-users-page__toolbar">
        <label className="admin-users-page__search">
          <span className="sr-only">{t('common.search')}</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('adminUsersPage.searchPlaceholder')}
          />
        </label>

        <div className="admin-users-page__filter-groups">
          <div className="admin-users-page__filters">
            {roleFilters.map((filterValue) => (
              <button
                key={filterValue}
                type="button"
                className={
                  filterValue === roleFilter
                    ? 'admin-users-page__filter admin-users-page__filter--active'
                    : 'admin-users-page__filter'
                }
                onClick={() => setRoleFilter(filterValue)}
              >
                {filterValue === 'student'
                  ? t('adminUsersPage.roleFilters.student')
                  : t(`adminUsersPage.roleFilters.${filterValue}`)}
              </button>
            ))}
          </div>

          <div className="admin-users-page__filters">
            {activityFilters.map((filterValue) => (
              <button
                key={filterValue}
                type="button"
                className={
                  filterValue === activityFilter
                    ? 'admin-users-page__filter admin-users-page__filter--active'
                    : 'admin-users-page__filter'
                }
                onClick={() => setActivityFilter(filterValue)}
              >
                {t(`adminUsersPage.activityFilters.${filterValue}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="admin-users-page__empty">
          <h3>{t('adminUsersPage.loadingTitle')}</h3>
          <p>{t('adminUsersPage.loadingDescription')}</p>
        </div>
      ) : users.length ? (
        <div className="admin-users-page__grid">
          {users.map((user) => {
            const isUpdating = updatingUserId === user.id
            const activityKey = user.isActive ? 'active' : 'inactive'
            const presenceKey = user.isOnline ? 'online' : 'offline'
            const isCurrentAdmin = user.id === currentUser?.id

            return (
              <article key={user.id} className="admin-users-page__card">
                <div className="admin-users-page__card-top">
                  <div className="admin-users-page__identity">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.name}
                        className="admin-users-page__avatar-image"
                      />
                    ) : (
                      <span className="admin-users-page__avatar">
                        {user.name.trim().charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}

                    <div>
                      <h3>{user.name}</h3>
                      <p>{user.email}</p>
                    </div>
                  </div>

                  <div className="admin-users-page__badges">
                    <span
                      className={`admin-users-page__role admin-users-page__role--${user.role}`}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                    <span
                      className={`admin-users-page__activity admin-users-page__activity--${activityKey}`}
                    >
                      {t(`adminUsersPage.activity.${activityKey}`)}
                    </span>
                    <span
                      className={`admin-users-page__presence admin-users-page__presence--${presenceKey}`}
                    >
                      {t(`adminUsersPage.presence.${presenceKey}`)}
                    </span>
                  </div>
                </div>

                <dl className="admin-users-page__meta">
                  <div>
                    <dt>{t('adminUsersPage.memberSince')}</dt>
                    <dd>{formatMemberDate(user.createdAt, languageCode)}</dd>
                  </div>
                  <div>
                    <dt>{t('adminUsersPage.createdEvents')}</dt>
                    <dd>{user.createdEventsCount}</dd>
                  </div>
                  <div>
                    <dt>{t('adminUsersPage.joinedEvents')}</dt>
                    <dd>{user.joinedEventsCount}</dd>
                  </div>
                  <div>
                    <dt>{t('adminUsersPage.lastActive')}</dt>
                    <dd>{formatLastActive(user.lastSeenAt, languageCode, t('adminUsersPage.neverSeen'))}</dd>
                  </div>
                </dl>

                <div className="admin-users-page__actions">
                  <button
                    type="button"
                    className={
                      user.role === 'admin'
                        ? 'admin-users-page__role-button admin-users-page__role-button--active'
                        : 'admin-users-page__role-button'
                    }
                    disabled={isUpdating || isCurrentAdmin}
                    onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'student' : 'admin')}
                  >
                    {user.role === 'admin'
                      ? t('adminUsersPage.removeAdmin')
                      : t('adminUsersPage.promoteAdmin')}
                  </button>

                  <button
                    type="button"
                    className={
                      user.isActive
                        ? 'admin-users-page__toggle-button admin-users-page__toggle-button--danger'
                        : 'admin-users-page__toggle-button admin-users-page__toggle-button--success'
                    }
                    disabled={isUpdating || isCurrentAdmin}
                    onClick={() => handleToggleActive(user)}
                  >
                    {isUpdating
                      ? t('adminUsersPage.updating')
                      : user.isActive
                        ? t('adminUsersPage.deactivate')
                        : t('adminUsersPage.activate')}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="admin-users-page__empty">
          <h3>{t('adminUsersPage.emptyTitle')}</h3>
          <p>{t('adminUsersPage.emptyDescription')}</p>
        </div>
      )}
    </section>
  )
}

export default AdminUsersPage
