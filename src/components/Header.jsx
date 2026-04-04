import { NavLink, useLocation } from 'react-router-dom'

import { useI18n } from '../i18n/LanguageContext'
import '../styles/header.css'

function Header({
  variant = 'default',
  currentUser,
  adminPendingCount = 0,
  showSearch = true,
  searchValue = '',
  onSearchChange = () => {},
  onOpenGuide = null,
}) {
  const { t } = useI18n()
  const isAdmin = currentUser?.role === 'admin'
  const adminBadgeLabel = adminPendingCount > 99 ? '99+' : String(adminPendingCount)
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

          {variant === 'students' && currentUser?.id && typeof onOpenGuide === 'function' ? (
            <button
              type="button"
              className="site-header__guide"
              onClick={onOpenGuide}
              data-tour="header-guide"
            >
              {t('header.guide')}
            </button>
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
