import { NavLink } from 'react-router-dom'

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

function Header({ variant = 'default', searchValue = '', onSearchChange = () => {} }) {
  const navItems = variant === 'students' ? studentNavItems : defaultNavItems

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

        {variant === 'students' ? (
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
        ) : null}

        <div className="site-header__actions">
          <nav className="site-header__nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'site-header__link site-header__link--active' : 'site-header__link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {variant === 'students' ? (
            <button type="button" className="site-header__profile" aria-label="Profile">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Zm0 2c-3.59 0-6.5 2.35-6.5 5.25 0 .41.34.75.75.75h11.5a.75.75 0 0 0 .75-.75C18.5 16.35 15.59 14 12 14Zm0-8.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 9.75c2.36 0 4.35 1.29 4.88 3H7.12c.53-1.71 2.52-3 4.88-3Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Header
