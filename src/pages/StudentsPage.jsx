import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/LanguageContext'
import { fetchRecommendedEvents } from '../api/aemApi'
import PageSEO from '../components/PageSEO'

/* ─── helpers ────────────────────────────────────────────────────────────── */
function getEventLifecycle(event, now = Date.now()) {
  if (!event?.eventDate) return null
  const start = new Date(`${event.eventDate}T${event.startTime || '00:00'}`).getTime()
  const end   = new Date(`${event.eventDate}T${event.endTime   || event.startTime || '00:00'}`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (now < start) return 'upcoming'
  if (now > end)   return 'finished'
  return 'inProgress'
}

function formatShortDate(dateStr, lang = 'en') {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-US', {
    month: 'short', day: 'numeric',
  })
}

const CATEGORY_CONFIG = {
  sport:       { label: 'Sport',       color: '#3b82f6', bg: '#eff6ff', icon: '⚽' },
  culture:     { label: 'Culture',     color: '#ec4899', bg: '#fdf2f8', icon: '🎨' },
  education:   { label: 'Education',   color: '#f59e0b', bg: '#fffbeb', icon: '📚' },
  music:       { label: 'Music',       color: '#8b5cf6', bg: '#f5f3ff', icon: '🎵' },
  tech:        { label: 'Tech',        color: '#06b6d4', bg: '#ecfeff', icon: '💻' },
  hackathon:   { label: 'Hackathon',   color: '#10b981', bg: '#ecfdf5', icon: '🚀' },
  general:     { label: 'General',     color: '#6b7280', bg: '#f9fafb', icon: '📌' },
}

function getCatCfg(cat) {
  return CATEGORY_CONFIG[cat?.toLowerCase()] || CATEGORY_CONFIG.general
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function CapacityBar({ joined, capacity }) {
  if (!capacity) return null
  const pct = Math.min(100, Math.round((joined / capacity) * 100))
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6'
  return (
    <div className="sp-cap">
      <div className="sp-cap-track">
        <div className="sp-cap-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="sp-cap-label">{joined} <span>/{capacity}</span></span>
    </div>
  )
}

function CategoryPill({ category }) {
  const cfg = getCatCfg(category)
  return (
    <span className="sp-pill" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}

function EventCard({ event, currentUser, onParticipate, onToggleLike, isParticipating }) {
  const [likeLoading, setLikeLoading] = useState(false)
  const isFinished = getEventLifecycle(event, Date.now()) === 'finished'
  const isCreator  = currentUser?.id === event.creatorId
  const canJoin    = currentUser?.id && !isCreator && event.moderationStatus === 'approved' && !isFinished
  const joined     = event.isJoined
  const waitlisted = event.isWaitlisted

  async function handleLike(e) {
    e.preventDefault(); e.stopPropagation()
    if (likeLoading || !currentUser?.id) return
    setLikeLoading(true)
    try { await onToggleLike?.(event) } finally { setLikeLoading(false) }
  }

  async function handleJoin(e) {
    e.preventDefault(); e.stopPropagation()
    if (!canJoin || isParticipating || joined || waitlisted) return
    await onParticipate?.(event)
  }

  const dateStr = formatShortDate(event.eventDate)

  return (
    <article className="sp-event-card">
      <Link to={`/events/${event.id}`} className="sp-event-thumb">
        <img src={event.image} alt={event.title} loading="lazy" />
      </Link>

      <div className="sp-event-body">
        <div className="sp-event-top">
          <CategoryPill category={event.category} />
          {!isCreator && (
            <button
              className={`sp-like-btn ${event.isLiked ? 'sp-like-btn--liked' : ''}`}
              onClick={handleLike}
              disabled={likeLoading}
              aria-label="Like event"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"/>
              </svg>
              {event.likesCount ?? 0}
            </button>
          )}
        </div>

        <Link to={`/events/${event.id}`} className="sp-event-name">{event.title}</Link>

        <div className="sp-event-meta">
          <span className="sp-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {dateStr}
          </span>
          {event.location && (
            <span className="sp-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 4.86 5.18 10.83 5.4 11.08a1.12 1.12 0 0 0 1.7 0c.22-.25 5.4-6.22 5.4-11.08A6.25 6.25 0 0 0 12 2.75Zm0 8.5A2.25 2.25 0 1 1 12 6.75a2.25 2.25 0 0 1 0 4.5Z"/>
              </svg>
              {event.location}
            </span>
          )}
          {event.capacity && (
            <CapacityBar joined={event.joinedCount || 0} capacity={event.capacity} />
          )}
        </div>
      </div>

      {isFinished && (
        <div className="sp-finished-badge">Finished</div>
      )}
      <div className={`sp-event-action ${isFinished ? 'sp-event-action--dim' : ''}`}>
        {isCreator ? (
          <>
            <span className="sp-action-mine">Your event</span>
            <button
              className={`sp-like-btn ${event.isLiked ? 'sp-like-btn--liked' : ''}`}
              onClick={handleLike}
              disabled={likeLoading}
              aria-label="Like event"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"/>
              </svg>
              {event.likesCount ?? 0}
            </button>
          </>
        ) : joined ? (
          <span className="sp-action-joined">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Joined
          </span>
        ) : waitlisted ? (
          <span className="sp-action-wait">Waitlisted</span>
        ) : isFinished ? (
          <span className="sp-action-finished">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2v20M2 12h20"/>
            </svg>
            Finished
          </span>
        ) : canJoin ? (
          <button
            className="sp-action-join"
            onClick={handleJoin}
            disabled={isParticipating}
          >
            {isParticipating ? (
              <span className="sp-spinner" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            )}
            Join
          </button>
        ) : (
          <Link to={`/events/${event.id}`} className="sp-action-view">View →</Link>
        )}
      </div>
    </article>
  )
}

function TrendingCard({ event }) {
  const dateStr = formatShortDate(event.eventDate)
  return (
    <Link to={`/events/${event.id}`} className="sp-trending-card">
      <div className="sp-trending-thumb">
        <img src={event.image} alt={event.title} loading="lazy" />
      </div>
      <div className="sp-trending-info">
        <div className="sp-trending-name">{event.title}</div>
        <div className="sp-trending-meta">
          <span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {dateStr}
          </span>
          {event.location && (
            <span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 4.86 5.18 10.83 5.4 11.08a1.12 1.12 0 0 0 1.7 0c.22-.25 5.4-6.22 5.4-11.08A6.25 6.25 0 0 0 12 2.75Zm0 8.5A2.25 2.25 0 1 1 12 6.75a2.25 2.25 0 0 1 0 4.5Z"/>
              </svg>
              {event.location}
            </span>
          )}
        </div>
        <div className="sp-trending-likes">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"/>
          </svg>
          {event.likesCount ?? 0}
        </div>
      </div>
    </Link>
  )
}

function TrendingBigCard({ event }) {
  const dateStr = formatShortDate(event.eventDate)
  return (
    <Link to={`/events/${event.id}`} className="sp-trending-big">
      <div className="sp-trending-big-img">
        <img src={event.image} alt={event.title} loading="lazy" />
        <div className="sp-trending-big-overlay">
          <span className="sp-trending-fire">🔥</span>
          <div className="sp-trending-big-name">{event.title}</div>
          <div className="sp-trending-big-meta">
            <span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {dateStr}
            </span>
            {event.location && (
              <span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 4.86 5.18 10.83 5.4 11.08a1.12 1.12 0 0 0 1.7 0c.22-.25 5.4-6.22 5.4-11.08A6.25 6.25 0 0 0 12 2.75Zm0 8.5A2.25 2.25 0 1 1 12 6.75a2.25 2.25 0 0 1 0 4.5Z"/>
                </svg>
                {event.location}
              </span>
            )}
            <span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#fca5a5">
                <path d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"/>
              </svg>
              {event.likesCount ?? 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
function StudentsPage({
  currentUser,
  events = [],
  eventsLoading = false,
  searchValue = '',
  onClearSearch = () => {},
  onToggleEventLike = null,
  onParticipateEvent = null,
}) {
  const { t } = useI18n()
  const [activeCategory, setActiveCategory] = useState('all')
  const [participatingId, setParticipatingId] = useState('')
  const [recommendedIds, setRecommendedIds] = useState([])
  const [now] = useState(Date.now())

  // Load recommendations
  useEffect(() => {
    if (!currentUser) return
    let mounted = true
    fetchRecommendedEvents()
      .then(list => { if (mounted) setRecommendedIds(list.map(e => e.id)) })
      .catch(() => {})
    return () => { mounted = false }
  }, [currentUser])

  // Show all approved events — backend no longer excludes ended ones
  const activeEvents = events

  // All unique categories from active events
  const categories = useMemo(() => {
    const cats = [...new Set(activeEvents.map(e => e.category?.toLowerCase()).filter(Boolean))]
    return cats.filter(c => CATEGORY_CONFIG[c])
  }, [activeEvents])

  // Filtered by category + search
  const filtered = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    return activeEvents.filter(e => {
      const catMatch = activeCategory === 'all' || e.category?.toLowerCase() === activeCategory
      const searchMatch = !q || `${e.title} ${e.location} ${e.category}`.toLowerCase().includes(q)
      return catMatch && searchMatch
    })
  }, [activeEvents, activeCategory, searchValue])

  // Sort recommended first
  const recMap = useMemo(() => new Map(recommendedIds.map((id, i) => [id, i])), [recommendedIds])
  const sortedEvents = useMemo(() =>
    [...filtered].sort((a, b) => {
      const ra = recMap.get(a.id) ?? 9999
      const rb = recMap.get(b.id) ?? 9999
      return ra - rb
    }), [filtered, recMap])

  // Trending = most liked
  const trending = useMemo(() =>
    [...activeEvents].sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0)).slice(0, 4),
  [activeEvents])

  // Summary stats
  const stats = useMemo(() => ({
    approved: activeEvents.length,
    joined:   activeEvents.filter(e => e.isJoined).length,
    upcoming: activeEvents.filter(e => getEventLifecycle(e, now) === 'upcoming').length,
    categories: new Set(activeEvents.map(e => e.category).filter(Boolean)).size,
  }), [activeEvents, now])

  async function handleParticipate(event) {
    if (participatingId || !onParticipateEvent) return
    setParticipatingId(event.id)
    try { await onParticipateEvent(event.id) } finally { setParticipatingId('') }
  }

  const userName = currentUser?.name?.split(' ')[0] ?? 'Student'
  const trendingBig  = trending[0]
  const trendingRest = trending.slice(1, 4)

  return (
    <div className="sp-root">
      <PageSEO title="Upcoming Events" description="Discover and join exciting events at your university" path="/students" />

      <style>{CSS}</style>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="sp-sidebar-left">
        {/* User chip */}
        <div className="sp-user-chip">
          <div className="sp-user-avatar">
            {currentUser?.profileImageUrl
              ? <img src={currentUser.profileImageUrl} alt={currentUser.name} />
              : <span>{userName.charAt(0).toUpperCase()}</span>}
          </div>
          <span className="sp-user-name">{userName}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        {/* Category nav */}
        <nav className="sp-cat-nav">
          <button
            className={`sp-cat-item ${activeCategory === 'all' ? 'sp-cat-item--active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            <span className="sp-cat-icon" style={{ background: '#3b82f6' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M3 3h7v7H3zm11 0h7v7h-7zm0 11h7v7h-7zM3 14h7v7H3z"/></svg>
            </span>
            All Events
          </button>
          {categories.map(cat => {
            const cfg = getCatCfg(cat)
            return (
              <button
                key={cat}
                className={`sp-cat-item ${activeCategory === cat ? 'sp-cat-item--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span className="sp-cat-icon" style={{ background: cfg.color }}>
                  {cfg.icon}
                </span>
                {cfg.label}
              </button>
            )
          })}
        </nav>

        {/* Trending sidebar list */}
        {trending.length > 0 && (
          <div className="sp-sidebar-trending">
            <p className="sp-sidebar-label">TRENDING EVENTS</p>
            <div className="sp-sidebar-trend-list">
              {trending.map(e => (
                <Link key={e.id} to={`/events/${e.id}`} className="sp-sidebar-trend-item">
                  <div className="sp-sidebar-trend-thumb">
                    <img src={e.image} alt={e.title} loading="lazy" />
                  </div>
                  <div className="sp-sidebar-trend-info">
                    <span className="sp-sidebar-trend-name">{e.title}</span>
                    <span className="sp-sidebar-trend-date">{formatShortDate(e.eventDate)}</span>
                  </div>
                  <span className="sp-sidebar-trend-likes">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#ef4444">
                      <path d="M12 20.5 4.9 13.9A4.95 4.95 0 0 1 12 7.1a4.95 4.95 0 0 1 7.1 6.8L12 20.5Z"/>
                    </svg>
                    {e.likesCount ?? 0}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="sp-main">

        {/* Hero intro */}
        <div className="sp-intro">
          <p className="sp-welcome">Welcome back, {currentUser?.name ?? 'Student'}</p>
          <h1 className="sp-headline">Discover Events</h1>
          <p className="sp-sub">Find and join events that match your interests</p>
        </div>

        {/* Stat cards */}
        <div className="sp-stats">
          {[
            { label: 'Available', value: stats.approved, icon: '📅' },
            { label: 'Joined', value: stats.joined, icon: '✓' },
            { label: 'Upcoming', value: stats.upcoming, icon: '⏰' },
            { label: 'Topics', value: stats.categories, icon: '🏷️' },
          ].map((s, i) => (
            <div key={i} className="sp-stat-card">
              <div className="sp-stat-icon">{s.icon}</div>
              <div className="sp-stat-body">
                <span className="sp-stat-label">{s.label}</span>
                <strong className="sp-stat-value">{s.value}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Category filter pills */}
        <div className="sp-filter-section">
          <h3 className="sp-filter-title">Explore by Topic</h3>
          <div className="sp-filter-row">
            {['all', ...categories].map(cat => {
              const cfg = cat === 'all' ? { label: 'All Events' } : getCatCfg(cat)
              return (
                <button
                  key={cat}
                  className={`sp-filter-pill ${activeCategory === cat ? 'sp-filter-pill--active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search clear */}
        {searchValue && (
          <div className="sp-search-indicator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5"/><path d="m16.5 16.5 4 4"/>
            </svg>
            <span>Searching for: <strong>{searchValue}</strong></span>
            <button onClick={onClearSearch} className="sp-clear-indicator-btn">✕</button>
          </div>
        )}

        {/* Events section */}
        <div className="sp-events-section">
          <div className="sp-section-header">
            <h2 className="sp-section-title">
              {activeCategory === 'all' ? 'All Events' : getCatCfg(activeCategory).label + ' Events'}
            </h2>
            <span className="sp-section-count">{sortedEvents.length}</span>
          </div>

          {eventsLoading ? (
            <div className="sp-skeleton-list">
              {[1,2,3].map(i => <div key={i} className="sp-skeleton-card" />)}
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="sp-empty">
              <div className="sp-empty-icon">🗓️</div>
              <div className="sp-empty-body">
                <p className="sp-empty-heading">No events at the moment</p>
                <p className="sp-empty-desc">
                  {searchValue
                    ? 'No events match your search. Try different keywords or filters.'
                    : 'Events will appear here soon. Check back regularly for new opportunities!'}
                </p>
              </div>
              {searchValue && (
                <button onClick={onClearSearch} className="sp-empty-action">
                  ✕ Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="sp-event-list">
              {sortedEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  currentUser={currentUser}
                  onParticipate={handleParticipate}
                  onToggleLike={onToggleEventLike}
                  isParticipating={participatingId === event.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="sp-sidebar-right">
        {trending.length > 0 && (
          <div className="sp-right-trending">
            <div className="sp-right-trending-header">
              <span className="sp-right-trending-title">Trending Events</span>
              <Link to="/students" className="sp-see-all">See All</Link>
            </div>

            {trendingBig && <TrendingBigCard event={trendingBig} />}

            <div className="sp-trending-list">
              {trendingRest.map(e => <TrendingCard key={e.id} event={e} />)}
            </div>
          </div>
        )}

        {/* Quick join stats */}
        {currentUser && (
          <div className="sp-right-stats">
            <p className="sp-sidebar-label">YOUR ACTIVITY</p>
            <div className="sp-activity-row">
              <div className="sp-activity-item">
                <strong>{stats.joined}</strong>
                <span>Joined</span>
              </div>
              <div className="sp-activity-item">
                <strong>{stats.upcoming}</strong>
                <span>Upcoming</span>
              </div>
              <div className="sp-activity-item">
                <strong>{stats.categories}</strong>
                <span>Categories</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ── Design tokens ── */
:root {
  --color-primary: #3b82f6;
  --color-primary-dark: #1d4ed8;
  --color-primary-light: #dbeafe;
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;
  --color-surface-alt2: #f3f4f6;
  --color-border: #e5e7eb;
  --color-border-light: #f3f4f6;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --color-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --color-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --background: #f8f7f4;
  --card-bg: #ffffff;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.sp-root {
  display: grid;
  grid-template-columns: 220px 1fr 250px;
  gap: 28px;
  max-width: 1680px;
  margin: 0 auto;
  padding: 24px 20px;
  min-height: calc(100vh - 70px);
  background: var(--background, #f8f7f4);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  align-items: start;
}

/* ── LEFT SIDEBAR ── */
.sp-sidebar-left {
  background: var(--card-bg);
  border-radius: var(--radius-xl);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: var(--shadow-sm);
  height: fit-content;
  position: sticky;
  top: 24px;
}

.sp-user-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid var(--color-border-light);
  border-radius: 14px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sp-user-chip:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-color: var(--color-primary);
}

.sp-user-avatar {
  width: 40px; height: 40px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-weight: 700; color: #fff; font-size: .9rem;
}
.sp-user-avatar img { width: 100%; height: 100%; object-fit: cover; }

.sp-user-name { font-size: .85rem; font-weight: 600; color: var(--color-text-primary); flex: 1; }

.sp-cat-nav { display: flex; flex-direction: column; gap: 4px; }

.sp-cat-item {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 12px; border-radius: 12px; border: none;
  background: transparent; color: var(--color-text-secondary);
  font-size: .85rem; font-weight: 500; cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
  text-align: left;
}
.sp-cat-item:hover {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
  transform: translateX(2px);
}
.sp-cat-item--active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
  color: var(--color-primary);
  font-weight: 700;
}

.sp-cat-icon {
  width: 32px; height: 32px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; flex-shrink: 0;
  background: rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
}
.sp-cat-item--active .sp-cat-icon {
  background: var(--color-primary);
  color: white;
}

.sp-sidebar-trending { margin-top: 20px; }
.sp-sidebar-label {
  font-size: .65rem; font-weight: 800; letter-spacing: .15em;
  color: var(--color-text-tertiary); margin: 0 0 12px 4px;
  text-transform: uppercase;
}

.sp-sidebar-trend-list { display: flex; flex-direction: column; gap: 6px; }

.sp-sidebar-trend-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 12px;
  text-decoration: none; color: var(--color-text-primary);
  transition: all 0.15s ease;
  border: 1px solid transparent;
}
.sp-sidebar-trend-item:hover {
  background: var(--color-surface-alt);
  border-color: var(--color-border);
}

.sp-sidebar-trend-thumb {
  width: 40px; height: 40px; border-radius: 10px; overflow: hidden; flex-shrink: 0;
  background: var(--color-surface-alt);
}
.sp-sidebar-trend-thumb img { width: 100%; height: 100%; object-fit: cover; }

.sp-sidebar-trend-info { flex: 1; min-width: 0; }
.sp-sidebar-trend-name {
  font-size: .8rem; font-weight: 700; color: var(--color-text-primary);
  display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sp-sidebar-trend-date { font-size: .72rem; color: var(--color-text-tertiary); }

.sp-sidebar-trend-likes {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: .75rem; font-weight: 700; color: #ef4444; white-space: nowrap;
}

/* ── MAIN ── */
.sp-main {
  background: var(--card-bg);
  border-radius: var(--radius-2xl);
  padding: 40px 44px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-width: 0;
}

.sp-intro { }
.sp-welcome {
  font-size: .95rem; color: var(--color-text-secondary); margin: 0 0 8px;
  font-weight: 500; letter-spacing: -.02em;
}
.sp-headline {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 2.8rem; font-weight: 800; letter-spacing: -.03em;
  color: var(--color-text-primary); margin: 0 0 8px; line-height: 1.1;
}
.sp-sub {
  font-size: .95rem; color: var(--color-text-secondary); margin: 0;
}

/* ── Stat cards ── */
.sp-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 18px;
}

.sp-stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px 24px;
  display: flex; align-items: center; gap: 16px;
  box-shadow: var(--color-shadow-sm);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.sp-stat-card::before {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 80px; height: 80px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(20%, -20%);
}

.sp-stat-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--color-shadow-md);
  transform: translateY(-2px);
}

.sp-stat-icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: var(--color-surface-alt2);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-size: 1.4rem;
  position: relative;
  z-index: 1;
}

.sp-stat-body {
  display: flex; flex-direction: column; gap: 4px;
  position: relative;
  z-index: 1;
}

.sp-stat-label {
  font-size: .75rem; color: var(--color-text-tertiary); font-weight: 600;
  text-transform: uppercase; letter-spacing: .05em;
}

.sp-stat-value {
  font-size: 1.8rem; font-weight: 800; color: var(--color-text-primary); line-height: 1;
}

/* ── Filter section ── */
.sp-filter-section {
  margin-top: 8px;
}

.sp-filter-title {
  font-size: .9rem; font-weight: 700; color: var(--color-text-primary);
  margin: 0 0 16px; letter-spacing: -.02em;
}

.sp-filter-row {
  display: flex; gap: 10px; flex-wrap: wrap;
}

.sp-filter-pill {
  padding: 10px 20px; border-radius: 12px; border: 1.5px solid var(--color-border);
  background: var(--color-surface); color: var(--color-text-secondary);
  font-size: .85rem; font-weight: 600;
  font-family: inherit; cursor: pointer;
  transition: all 0.15s ease;
}

.sp-filter-pill:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%);
}

.sp-filter-pill--active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* ── Search indicator ── */
.sp-search-indicator {
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%);
  border: 1px solid var(--color-primary);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: .9rem;
  color: var(--color-text-secondary);
}

.sp-search-indicator svg {
  color: var(--color-primary);
  flex-shrink: 0;
}

.sp-search-indicator strong {
  color: var(--color-text-primary);
  font-weight: 700;
}

.sp-clear-indicator-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  transition: color 0.15s ease;
}

.sp-clear-indicator-btn:hover {
  color: var(--color-text-primary);
}

/* ── Events section ── */
.sp-events-section {
  display: flex; flex-direction: column; gap: 20px;
}

.sp-section-header {
  display: flex; align-items: center; justify-content: space-between;
}

.sp-section-title {
  font-size: 1.3rem; font-weight: 800; color: var(--color-text-primary);
  letter-spacing: -.02em; margin: 0;
}

.sp-section-count {
  font-size: .85rem; color: var(--color-text-secondary); font-weight: 700;
  background: var(--color-surface-alt);
  padding: 8px 14px; border-radius: 12px;
  text-transform: uppercase; letter-spacing: .05em;
}

.sp-event-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Event card ── */
.sp-event-card {
  display: flex; align-items: center; gap: 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: default;
  position: relative;
  overflow: hidden;
}

.sp-event-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--color-primary), transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.sp-event-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--color-shadow-md);
  transform: translateX(2px);
}

.sp-event-card:hover::before {
  opacity: 1;
}

.sp-event-thumb {
  width: 140px; height: 100px; border-radius: 14px; overflow: hidden;
  flex-shrink: 0; background: var(--color-surface-alt); display: block;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.sp-event-thumb img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform 0.3s ease;
}

.sp-event-card:hover .sp-event-thumb img {
  transform: scale(1.05);
}

.sp-event-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sp-event-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sp-pill {
  padding: 5px 12px; border-radius: 8px;
  font-size: .7rem; font-weight: 800; letter-spacing: .07em;
  text-transform: uppercase;
  width: fit-content;
}

.sp-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #f1f1f1;
  border-radius: 9999px;
  padding: 6px 14px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #ef4444;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.sp-like-btn:hover {
  background: #fff;
  border-color: #ef4444;
  transform: scale(1.05);
}

.sp-like-btn--liked {
  background: #fff1f2;
  border-color: #ef4444;
}

.sp-event-name {
  font-size: 1.1rem; font-weight: 700; color: var(--color-text-primary);
  letter-spacing: -.01em;
  text-decoration: none; line-height: 1.3;
  transition: color 0.15s ease;
}

.sp-event-name:hover { color: var(--color-primary); }

.sp-event-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: auto;
}

.sp-meta-item {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--color-text-secondary); font-weight: 500;
}

.sp-meta-item svg {
  opacity: 0.6;
}

/* ── Capacity bar ── */
.sp-cap {
  display: inline-flex; align-items: center; gap: 8px;
}

.sp-cap-track {
  width: 100px; height: 6px; background: var(--color-border); border-radius: 999px; overflow: hidden;
}

.sp-cap-fill {
  height: 100%; border-radius: 999px; transition: width 0.6s ease;
  background: linear-gradient(90deg, var(--color-primary), #3b82f6);
}

.sp-cap-label {
  font-size: .75rem; font-weight: 700; color: var(--color-text-secondary);
  white-space: nowrap;
}

.sp-cap-label span {
  color: var(--color-text-tertiary); font-weight: 500;
}

/* ── Action buttons ── */
.sp-event-action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
}

.sp-action-join {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--color-primary); color: white; border: none;
  border-radius: 12px;
  padding: 12px 22px; font-size: .875rem; font-weight: 700;
  font-family: inherit; cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.sp-action-join:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  background: var(--color-primary-dark);
}

.sp-action-join:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.sp-action-mine,
.sp-event-action .sp-action-joined,
.sp-action-wait,
.sp-action-view {
  font-size: 0.82rem;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.sp-action-mine {
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.sp-event-action .sp-action-joined {
  background: rgba(16, 185, 129, 0.1);
  color: #16a34a;
  border: 1.5px solid rgba(16, 185, 129, 0.3);
}

.sp-action-wait {
  background: rgba(217, 119, 6, 0.1);
  color: #d97706;
  border: 1.5px solid rgba(217, 119, 6, 0.3);
}

.sp-action-view {
  background: var(--color-surface-alt);
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  text-decoration: none;
  transition: all 0.15s ease;
}

.sp-action-view:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%);
  border-color: var(--color-primary);
}

/* ── Spinner ── */
.sp-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white;
  animation: spin 0.7s linear infinite; display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Empty state ── */
.sp-empty {
  padding: 80px 48px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%);
  border-radius: 20px;
  border: 1px solid var(--color-border);
  min-height: 320px;
  justify-content: center;
}

.sp-empty-icon {
  font-size: 5rem;
  display: block;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-16px); }
}

.sp-empty-body {
  max-width: 380px;
}

.sp-empty-heading {
  font-size: 1.3rem; font-weight: 800; color: var(--color-text-primary);
  margin: 0; letter-spacing: -.02em;
}

.sp-empty-desc {
  font-size: .95rem; color: var(--color-text-secondary); margin: 8px 0 0;
  line-height: 1.6;
}

.sp-empty-action {
  margin-top: 16px;
}

/* ── Skeleton ── */
.sp-skeleton-list {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sp-skeleton-card {
  height: 132px; border-radius: 16px;
  background: linear-gradient(90deg, var(--color-surface-alt) 25%, var(--color-border) 50%, var(--color-surface-alt) 75%);
  background-size: 800px 100%;
  animation: shimmer 2s infinite linear;
}

@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

/* ── RIGHT SIDEBAR ── */
.sp-sidebar-right {
  background: var(--card-bg);
  border-radius: var(--radius-xl);
  padding: 20px 16px;
  height: fit-content;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 24px;
}

.sp-right-trending {
  display: flex; flex-direction: column; gap: 16px;
}

.sp-right-trending-header {
  display: flex; align-items: center; justify-content: space-between;
}

.sp-right-trending-title {
  font-size: .95rem; font-weight: 800; color: var(--color-text-primary);
  letter-spacing: -.01em;
}

.sp-see-all {
  font-size: .78rem; font-weight: 700; color: var(--color-primary);
  text-decoration: none;
  transition: color 0.15s ease;
  text-transform: uppercase; letter-spacing: .05em;
}

.sp-see-all:hover { color: var(--color-primary-dark); }

/* ── Trending big card ── */
.sp-trending-big {
  display: block; text-decoration: none; border-radius: 16px; overflow: hidden;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.sp-trending-big:hover {
  border-color: var(--color-primary);
  box-shadow: var(--color-shadow-md);
}

.sp-trending-big-img {
  position: relative; height: 180px; overflow: hidden;
}

.sp-trending-big-img img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: transform 0.3s ease;
}

.sp-trending-big:hover .sp-trending-big-img img {
  transform: scale(1.08);
}

.sp-trending-big-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%);
  padding: 16px;
  display: flex; flex-direction: column; justify-content: flex-end;
}

.sp-trending-fire {
  font-size: 1.3rem;
  position: absolute; top: 12px; left: 14px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

.sp-trending-big-name {
  font-size: .95rem; font-weight: 800; color: white; margin: 0 0 6px;
  line-height: 1.3; letter-spacing: -.01em;
}

.sp-trending-big-meta {
  display: flex; gap: 12px; flex-wrap: wrap;
}

.sp-trending-big-meta span {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: .73rem; color: rgba(255, 255, 255, 0.9); font-weight: 600;
}

/* ── Trending list card ── */
.sp-trending-list {
  display: flex; flex-direction: column; gap: 10px;
}

.sp-trending-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--color-surface-alt);
  border: 1px solid transparent;
  border-radius: 14px; padding: 12px;
  text-decoration: none;
  transition: all 0.15s ease;
}

.sp-trending-card:hover {
  background: var(--color-surface-alt2);
  border-color: var(--color-border);
}

.sp-trending-thumb {
  width: 52px; height: 52px; border-radius: 12px; overflow: hidden;
  flex-shrink: 0; background: var(--color-border);
}

.sp-trending-thumb img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}

.sp-trending-info {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px;
}

.sp-trending-name {
  font-size: .84rem; font-weight: 700; color: var(--color-text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.sp-trending-meta {
  display: flex; gap: 8px;
}

.sp-trending-meta span {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: .72rem; color: var(--color-text-tertiary);
}

.sp-trending-likes {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: .78rem; font-weight: 800; color: #ef4444; white-space: nowrap;
}

/* ── Right stats ── */
.sp-right-stats {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 18px;
  margin-top: 8px;
}

.sp-activity-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sp-activity-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 4px;
}

.sp-activity-item strong {
  font-size: 1.4rem; font-weight: 800; color: var(--color-text-primary);
}

.sp-activity-item span {
  font-size: .72rem; color: var(--color-text-tertiary); font-weight: 600;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .sp-root {
    grid-template-columns: 1fr;
    padding: 16px 12px;
    gap: 20px;
  }
  .sp-sidebar-left,
  .sp-sidebar-right {
    display: none;
  }
  .sp-main {
    padding: 24px 20px;
  }
}

@media (max-width: 640px) {
  .sp-main {
    padding: 20px 16px;
  }

  .sp-stats {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .sp-event-list {
    gap: 16px;
  }

  .sp-event-card {
    padding: 14px;
    gap: 12px;
  }

  .sp-event-thumb {
    width: 100px;
    height: 76px;
  }

  .sp-event-name {
    font-size: 1.05rem;
  }

  .sp-event-meta {
    gap: 12px;
    font-size: 0.85rem;
  }
}
`

export default StudentsPage
