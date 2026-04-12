import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { useI18n } from '../i18n/LanguageContext'
import '../styles/header.css'

function Header({
  variant = 'default',
  currentUser,
  adminPendingCount = 0,
  showSearch = true,
  searchValue = '',
  onSearchChange = () => {},
  notifications = [],
  notificationsLoading = false,
  unreadNotificationsCount = 0,
  onMarkNotificationRead = () => {},
  onMarkAllNotificationsRead = () => {},
}) {
  const { t } = useI18n()
  const isAdmin = currentUser?.role === 'admin'
  const adminBadgeLabel = adminPendingCount > 99 ? '99+' : String(adminPendingCount)
  const notificationBadgeLabel =
    unreadNotificationsCount > 99 ? '99+' : String(unreadNotificationsCount)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationsRef = useRef(null)
  const navItems =
    variant === 'students'
      ? [
          { to: '/students', label: t('common.events') },
          ...(currentUser?.id ? [{ to: '/joined-events', label: t('common.joinedEvents') }] : []),
          { to: '/organizer', label: t('common.myEvents') },
          ...(isAdmin
            ? [
                {
                  to: '/admin',
                  label: t('common.adminPanel'),
                  badge: adminPendingCount > 0 ? adminBadgeLabel : '',
                },
              ]
            : []),
        ]
      : [
          { to: '/', label: t('common.auth') },
          { to: '/students', label: t('common.students') },
          { to: '/organizer', label: t('common.myEvents') },
          ...(isAdmin
            ? [
                {
                  to: '/admin',
                  label: t('common.adminPanel'),
                  badge: adminPendingCount > 0 ? adminBadgeLabel : '',
                },
              ]
            : []),
        ]
  const location = useLocation()
  const profileInitial = currentUser?.name?.trim()?.charAt(0)?.toUpperCase() ?? '?'
  const profileLabel = currentUser?.name ?? t('header.profile')
  const profileImageUrl = currentUser?.profileImageUrl ?? currentUser?.settings?.profileImageUrl ?? ''

  useEffect(() => {
    if (!isNotificationsOpen) {
      return
    }

    function handlePointerDown(event) {
      if (!notificationsRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isNotificationsOpen])

  function formatNotificationTimestamp(value) {
    if (!value) {
      return ''
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return ''
    }

    return parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function getTourMarker(path) {
    switch (path) {
      case '/students':
        return 'header-events-nav'
      case '/joined-events':
        return 'header-joined-events-nav'
      case '/organizer':
        return 'header-my-events-nav'
      case '/admin':
        return 'header-admin-nav'
      default:
        return undefined
    }
  }

  function isNavItemActive(path) {
    if (variant === 'students' && path === '/students') {
      return location.pathname === '/students' || location.pathname.startsWith('/events/')
    }

    if (variant === 'students' && path === '/admin') {
      return location.pathname === '/admin' || location.pathname.startsWith('/admin/')
    }

    return location.pathname === path
  }

  return (
    <header className={variant === 'students' ? 'site-header site-header--students' : 'site-header'}>
      <div className="site-header__ambient" aria-hidden="true" />
      <div className={variant === 'students' ? 'site-header__inner site-header__inner--students' : 'site-header__inner'}>
        <div className="site-header__brand-group">
          {variant === 'students' ? (
            <NavLink to="/students" className="site-header__brand site-header__brand--students">
              <img src="/logo.png" alt={`${t('common.appName')} logo`} className="site-header__brand-logo" />
            </NavLink>
          ) : (
            <div>
              <p className="site-header__eyebrow">{t('header.brandEyebrow')}</p>
              <NavLink to="/" className="site-header__brand">
                {t('common.appName')}
              </NavLink>
            </div>
          )}
        </div>

        {variant === 'students' && showSearch ? (
          <label
            className="site-header__search"
            aria-label={t('header.searchLabel')}
            data-tour="header-search"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                fill="currentColor"
              />
            </svg>
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t('header.searchPlaceholder')}
            />
          </label>
        ) : variant === 'students' ? <div className="site-header__search-spacer" /> : null}

        <div className="site-header__actions">
          <nav className="site-header__nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-tour={getTourMarker(item.to)}
                className={
                  isNavItemActive(item.to)
                    ? 'site-header__link site-header__link--active'
                    : 'site-header__link'
                }
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span
                    className="site-header__badge"
                    aria-label={t('header.pendingAdminBadge', { count: adminPendingCount })}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          {variant === 'students' && currentUser?.id ? (
            <div className="site-header__notifications" ref={notificationsRef}>
              <button
                type="button"
                className={
                  isNotificationsOpen
                    ? 'site-header__notifications-toggle site-header__notifications-toggle--active'
                    : 'site-header__notifications-toggle'
                }
                onClick={() => setIsNotificationsOpen((current) => !current)}
                aria-label={t('header.notifications')}
                aria-expanded={isNotificationsOpen}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3.25a5.25 5.25 0 0 0-5.25 5.25v2.12c0 .82-.28 1.61-.8 2.24l-1.21 1.48A1.75 1.75 0 0 0 6.09 17h11.82a1.75 1.75 0 0 0 1.35-2.66l-1.21-1.48a3.54 3.54 0 0 1-.8-2.24V8.5A5.25 5.25 0 0 0 12 3.25Zm0 18.5a2.62 2.62 0 0 0 2.48-1.75H9.52A2.62 2.62 0 0 0 12 21.75Z"
                    fill="currentColor"
                  />
                </svg>
                {unreadNotificationsCount > 0 ? (
                  <span className="site-header__notifications-badge">{notificationBadgeLabel}</span>
                ) : null}
              </button>

              {isNotificationsOpen ? (
                <div className="site-header__notifications-panel">
                  <div className="site-header__notifications-top">
                    <div>
                      <strong>{t('header.notifications')}</strong>
                      <p>{t('header.notificationsSubtitle')}</p>
                    </div>
                    {unreadNotificationsCount > 0 ? (
                      <button
                        type="button"
                        className="site-header__notifications-action"
                        onClick={async () => {
                          await onMarkAllNotificationsRead()
                        }}
                      >
                        {t('header.markAllRead')}
                      </button>
                    ) : null}
                  </div>

                  {notificationsLoading ? (
                    <p className="site-header__notifications-empty">
                      {t('header.notificationsLoading')}
                    </p>
                  ) : notifications.length ? (
                    <div className="site-header__notifications-list">
                      {notifications.map((notification) => {
                        const notificationContent = (
                          <>
                            <div className="site-header__notifications-item-copy">
                              <strong>{notification.title}</strong>
                              <p>{notification.message}</p>
                            </div>
                            <span>{formatNotificationTimestamp(notification.createdAt)}</span>
                          </>
                        )

                        return notification.linkUrl ? (
                          <Link
                            key={notification.id}
                            to={notification.linkUrl}
                            className={
                              notification.readAt
                                ? 'site-header__notifications-item'
                                : 'site-header__notifications-item site-header__notifications-item--unread'
                            }
                            onClick={() => {
                              onMarkNotificationRead(notification.id)
                              setIsNotificationsOpen(false)
                            }}
                          >
                            {notificationContent}
                          </Link>
                        ) : (
                          <button
                            key={notification.id}
                            type="button"
                            className={
                              notification.readAt
                                ? 'site-header__notifications-item'
                                : 'site-header__notifications-item site-header__notifications-item--unread'
                            }
                            onClick={() => onMarkNotificationRead(notification.id)}
                          >
                            {notificationContent}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="site-header__notifications-empty">
                      {t('header.notificationsEmpty')}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {variant === 'students' ? (
            <NavLink
              to="/profile"
              className={
                location.pathname === '/profile'
                  ? 'site-header__profile site-header__profile--active'
                  : 'site-header__profile'
              }
              aria-label={profileLabel}
              title={profileLabel}
            >
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={profileLabel} className="site-header__profile-image" />
              ) : (
                <span>{profileInitial}</span>
              )}
            </NavLink>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Header
