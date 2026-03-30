import { NavLink, useLocation } from 'react-router-dom'

import '../styles/header.css'

const defaultNavItems = [
  { to: '/', label: 'Auth' },
  { to: '/students', label: 'Students' },
  { to: '/organizer', label: 'Organizer' },
]

const studentNavItems = [
  { to: '/students', label: 'Events' },
  { to: '/organizer', label: 'My Events' },
]

function Header({
  variant = 'default',
  currentUser,
  showSearch = true,
  searchValue = '',
  onSearchChange = () => {},
}) {
  const navItems = variant === 'students' ? studentNavItems : defaultNavItems
  const location = useLocation()
  const profileInitial = currentUser?.name?.trim()?.charAt(0)?.toUpperCase() ?? '?'
  const profileLabel = currentUser?.name ? `${currentUser.name} profile` : 'Profile'
  const profileImageUrl = currentUser?.profileImageUrl ?? currentUser?.settings?.profileImageUrl ?? ''

  function isNavItemActive(path) {
    if (variant === 'students' && path === '/students') {
      return location.pathname === '/students' || location.pathname.startsWith('/events/')
    }

    return location.pathname === path
  }

  return (
    <header className={variant === 'students' ? 'site-header site-header--students' : 'site-header'}>
      <div className={variant === 'students' ? 'site-header__inner site-header__inner--students' : 'site-header__inner'}>
        <div className="site-header__brand-group">
          {variant === 'students' ? (
            <NavLink to="/students" className="site-header__brand site-header__brand--students">
              <img src="/logo.png" alt="AEM logo" className="site-header__brand-logo" />
            </NavLink>
          ) : (
            <div>
              <p className="site-header__eyebrow">Ajou Event Manager</p>
              <NavLink to="/" className="site-header__brand">
                AEM
              </NavLink>
            </div>
          )}
        </div>

        {variant === 'students' && showSearch ? (
          <label className="site-header__search" aria-label="Search events">
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
              placeholder="Search events..."
            />
          </label>
        ) : variant === 'students' ? <div className="site-header__search-spacer" /> : null}

        <div className="site-header__actions">
          <nav className="site-header__nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={
                  isNavItemActive(item.to)
                    ? 'site-header__link site-header__link--active'
                    : 'site-header__link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {variant === 'students' ? (
            <NavLink
              to="/profile"
              className={
                location.pathname === '/profile'
                  ? 'site-header__profile site-header__profile--active'
                  : 'site-header__profile'
              }
              aria-label={profileLabel}
              title={currentUser?.name ?? 'Profile'}
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
