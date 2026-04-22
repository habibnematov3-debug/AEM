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
  const isCreator  = currentUser?.id === event.creatorId
  const canJoin    = currentUser?.id && !isCreator && event.moderationStatus === 'approved'
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

      <div className="sp-event-action">
        {isCreator ? (
          <span className="sp-action-mine">Your event</span>
        ) : joined ? (
          <span className="sp-action-joined">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Joined
          </span>
        ) : waitlisted ? (
          <span className="sp-action-wait">Waitlisted</span>
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

  // Active (non-finished) events
  const activeEvents = useMemo(() =>
    events.filter(e => getEventLifecycle(e, now) !== 'finished'), [events, now])

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
          <h1 className="sp-headline">Upcoming Events</h1>
          <p className="sp-sub">Discover and join exciting events happening at your university</p>
        </div>

        {/* Stat cards */}
        <div className="sp-stats">
          {[
            { label: 'Approved Events', value: stats.approved, color: '#3b82f6', bg: '#eff6ff',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
            { label: 'Joined Events', value: stats.joined, color: '#06b6d4', bg: '#ecfeff',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { label: 'Upcoming', value: stats.upcoming, color: '#8b5cf6', bg: '#f5f3ff',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
            { label: 'Categories', value: stats.categories, color: '#f59e0b', bg: '#fffbeb',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
          ].map((s, i) => (
            <div key={i} className="sp-stat-card" style={{ '--sc': s.color, '--sb': s.bg }}>
              <div className="sp-stat-icon">{s.icon}</div>
              <div className="sp-stat-body">
                <span className="sp-stat-label">{s.label}</span>
                <strong className="sp-stat-value">{s.value}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Category filter pills */}
        <div className="sp-filter-row">
          {['all', ...categories].map(cat => {
            const cfg = cat === 'all' ? { label: 'All' } : getCatCfg(cat)
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

        {/* Search clear */}
        {searchValue && (
          <div className="sp-search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5"/><path d="m16.5 16.5 4 4"/>
            </svg>
            Searching: <strong>{searchValue}</strong>
            <button onClick={onClearSearch} className="sp-clear-btn">✕ Clear</button>
          </div>
        )}

        {/* Event list panel */}
        <div className="sp-panel">
          <div className="sp-panel-header">
            <h2 className="sp-panel-title">
              {activeCategory === 'all' ? 'Upcoming Events' : getCatCfg(activeCategory).label + ' Events'}
            </h2>
            <span className="sp-panel-count">{sortedEvents.length} events</span>
          </div>

          {eventsLoading ? (
            <div className="sp-skeleton-list">
              {[1,2,3].map(i => <div key={i} className="sp-skeleton-card" />)}
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="sp-empty">
              <span className="sp-empty-icon">🗓️</span>
              <p>No events found</p>
              <small>
                {searchValue
                  ? 'We couldn\'t find any events matching your search. Try adjusting your filters or search terms.'
                  : 'No events are currently available. Check back soon or explore other categories!'}
              </small>
              {searchValue && (
                <button onClick={onClearSearch} className="sp-filter-pill sp-filter-pill--active">
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

.sp-root {
  display: grid;
  grid-template-columns: 220px minmax(0,1fr) 280px;
  gap: 0;
  min-height: 100vh;
  background: #f2f0ec;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  align-items: start;
}

/* ── LEFT SIDEBAR ── */
.sp-sidebar-left {
  background: #fff;
  border-right: 1px solid #e9e6e0;
  min-height: 100vh;
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: sticky;
  top: 0;
  overflow-y: auto;
  max-height: 100vh;
}

.sp-user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8f7f4;
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
}

.sp-user-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg,#3b82f6,#8b5cf6);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sp-user-avatar img { width:100%; height:100%; object-fit:cover; }
.sp-user-avatar span { color:#fff; font-size:.85rem; font-weight:700; }
.sp-user-name { font-size:.84rem; font-weight:600; color:#1c1917; flex:1; }

.sp-cat-nav { display:flex; flex-direction:column; gap:3px; }

.sp-cat-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 12px; border: none;
  background: transparent; color: #57534e;
  font-size: .84rem; font-weight: 500; cursor: pointer;
  font-family: inherit;
  transition: background .15s, color .15s;
  text-align: left;
}
.sp-cat-item:hover { background: #f4f1eb; color: #1c1917; }
.sp-cat-item--active { background: #e8f0fe; color: #2563eb; font-weight: 700; }

.sp-cat-icon {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: .95rem; flex-shrink: 0;
}

.sp-sidebar-trending { margin-top: 16px; }
.sp-sidebar-label {
  font-size: .66rem; font-weight: 700; letter-spacing: .12em;
  color: #a8a29e; margin: 0 0 10px 2px;
}

.sp-sidebar-trend-list { display:flex; flex-direction:column; gap:2px; }

.sp-sidebar-trend-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 10px;
  text-decoration: none; color: #1c1917;
  transition: background .14s;
}
.sp-sidebar-trend-item:hover { background: #f4f1eb; }

.sp-sidebar-trend-thumb {
  width: 36px; height: 36px; border-radius: 8px; overflow: hidden; flex-shrink:0;
  background: #e5e2db;
}
.sp-sidebar-trend-thumb img { width:100%; height:100%; object-fit:cover; }

.sp-sidebar-trend-info { flex:1; min-width:0; }
.sp-sidebar-trend-name {
  font-size: .8rem; font-weight: 600; color: #1c1917;
  display: block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.sp-sidebar-trend-date { font-size:.72rem; color:#a8a29e; }

.sp-sidebar-trend-likes {
  display:inline-flex; align-items:center; gap:3px;
  font-size:.75rem; font-weight:600; color:#ef4444; white-space:nowrap;
}

/* ── MAIN ── */
.sp-main {
  padding: 32px 28px 60px;
  display: flex; flex-direction: column; gap: 22px;
  min-width: 0;
}

.sp-intro { }
.sp-welcome { font-size:.9rem; color:#78716c; margin:0 0 6px; font-weight:500; }
.sp-headline {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 2.4rem; font-weight: 800; letter-spacing:-.03em;
  color: #0f172a; margin: 0 0 6px; line-height:1.08;
}
.sp-sub { font-size:.9rem; color:#78716c; margin:0; }

/* ── Stat cards ── */
.sp-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 12px;
}

.sp-stat-card {
  background: #fff;
  border: 1.5px solid var(--sc);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  transition: transform .15s, box-shadow .15s;
}
.sp-stat-card:hover { transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,0,0,.09); }

.sp-stat-icon {
  width: 42px; height: 42px; border-radius: 12px;
  background: var(--sb); display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.sp-stat-body { display:flex; flex-direction:column; gap:2px; }
.sp-stat-label { font-size:.75rem; color:#78716c; font-weight:500; }
.sp-stat-value { font-size:1.6rem; font-weight:800; color:#0f172a; line-height:1; }

/* ── Filter pills ── */
.sp-filter-row { display:flex; gap:8px; flex-wrap:wrap; }

.sp-filter-pill {
  padding: 8px 18px; border-radius: 999px; border: 1.5px solid #e4dfd6;
  background: #fff; color: #57534e; font-size:.84rem; font-weight:600;
  font-family:inherit; cursor:pointer;
  transition: all .14s;
}
.sp-filter-pill:hover { border-color:#3b82f6; color:#3b82f6; }
.sp-filter-pill--active {
  background: #3b82f6; color:#fff; border-color:#3b82f6;
}

/* ── Search bar ── */
.sp-search-bar {
  display:flex; align-items:center; gap:8px;
  background:#fff; border:1.5px solid #e4dfd6; border-radius:12px;
  padding:10px 16px; font-size:.875rem; color:#57534e;
}
.sp-clear-btn {
  margin-left:auto; border:none; background:#f4f1eb; color:#78716c;
  border-radius:8px; padding:4px 10px; font-size:.78rem; font-weight:600;
  cursor:pointer; font-family:inherit; transition:background .14s;
}
.sp-clear-btn:hover { background:#e4dfd6; }

/* ── Event panel ── */
.sp-panel {
  background:#fff; border-radius:20px; overflow:hidden;
  border:1px solid #e9e6e0;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
}

.sp-panel-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:20px 22px 0;
}
.sp-panel-title {
  font-size:1.05rem; font-weight:700; color:#0f172a; letter-spacing:-.01em;
}
.sp-panel-count {
  font-size:.78rem; color:#a8a29e; font-weight:500;
  background:#f4f1eb; padding:4px 10px; border-radius:999px;
}

.sp-event-list { padding:12px; display:flex; flex-direction:column; gap:10px; }

/* ── Event card ── */
.sp-event-card {
  display:flex; align-items:center; gap:16px;
  background:#fff; border:1.5px solid #e9e6e0; border-radius:16px;
  padding:14px; transition:border-color .14s, box-shadow .14s;
  cursor:default;
}
.sp-event-card:hover { border-color:#c4b9aa; box-shadow:0 2px 12px rgba(0,0,0,.07); }

.sp-event-thumb {
  width: 120px; height: 86px; border-radius:12px; overflow:hidden;
  flex-shrink:0; background:#e5e2db; display:block;
}
.sp-event-thumb img { width:100%; height:100%; object-fit:cover; display:block; }

.sp-event-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:7px; }

.sp-event-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }

.sp-pill {
  padding:4px 10px; border-radius:6px;
  font-size:.68rem; font-weight:700; letter-spacing:.06em;
}

.sp-like-btn {
  display:inline-flex; align-items:center; gap:5px;
  border:1.5px solid #e9e6e0; background:#fff; border-radius:999px;
  padding:5px 12px; font-size:.8rem; font-weight:600;
  color:#78716c; cursor:pointer; font-family:inherit;
  transition:all .14s;
}
.sp-like-btn:hover { border-color:#ef4444; color:#ef4444; }
.sp-like-btn--liked { color:#ef4444; border-color:#fca5a5; background:#fff7f7; }

.sp-event-name {
  font-size:1.1rem; font-weight:700; color:#0f172a; letter-spacing:-.01em;
  text-decoration:none; line-height:1.2;
  transition:color .14s;
}
.sp-event-name:hover { color:#3b82f6; }

.sp-event-meta {
  display:flex; align-items:center; gap:14px; flex-wrap:wrap;
}
.sp-meta-item {
  display:inline-flex; align-items:center; gap:5px;
  font-size:.78rem; color:#78716c; font-weight:500;
}

/* ── Capacity bar ── */
.sp-cap { display:inline-flex; align-items:center; gap:7px; }
.sp-cap-track {
  width:80px; height:5px; background:#e9e6e0; border-radius:999px; overflow:hidden;
}
.sp-cap-fill { height:100%; border-radius:999px; transition:width .6s; }
.sp-cap-label { font-size:.75rem; font-weight:600; color:#57534e; }
.sp-cap-label span { color:#a8a29e; font-weight:400; }

/* ── Action buttons ── */
.sp-event-action { flex-shrink:0; }

.sp-action-join {
  display:inline-flex; align-items:center; gap:7px;
  background:#3b82f6; color:#fff; border:none; border-radius:12px;
  padding:11px 20px; font-size:.875rem; font-weight:700;
  font-family:inherit; cursor:pointer;
  transition:transform .14s, filter .14s;
  box-shadow:0 2px 12px rgba(59,130,246,.32);
}
.sp-action-join:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.08); }
.sp-action-join:disabled { opacity:.65; cursor:not-allowed; }

.sp-action-joined {
  display:inline-flex; align-items:center; gap:6px;
  background:#ecfdf5; color:#16a34a; border:1.5px solid #bbf7d0;
  border-radius:12px; padding:10px 18px; font-size:.875rem; font-weight:700;
}

.sp-action-wait {
  display:inline-flex; align-items:center; gap:6px;
  background:#fffbeb; color:#d97706; border:1.5px solid #fde68a;
  border-radius:12px; padding:10px 18px; font-size:.875rem; font-weight:700;
}

.sp-action-mine {
  font-size:.8rem; color:#a8a29e; font-weight:500;
  background:#f4f1eb; padding:10px 16px; border-radius:12px;
  display:inline-block;
}

.sp-action-view {
  display:inline-flex; align-items:center;
  background:#f4f1eb; color:#57534e; border-radius:12px;
  padding:10px 18px; font-size:.875rem; font-weight:600;
  text-decoration:none; transition:background .14s;
}
.sp-action-view:hover { background:#e4dfd6; }

/* ── Spinner ── */
.sp-spinner {
  width:14px; height:14px; border-radius:50%;
  border:2px solid rgba(255,255,255,.3); border-top-color:#fff;
  animation:spin .7s linear infinite; display:block;
}
@keyframes spin { to { transform:rotate(360deg); } }

/* ── Empty state ── */
.sp-empty {
  padding:64px 32px; text-align:center;
  display:flex; flex-direction:column; align-items:center; gap:16px;
  background: linear-gradient(135deg, rgba(59,130,246,.02) 0%, rgba(139,92,246,.02) 100%);
  border-radius: 16px;
  min-height: 280px;
  justify-content: center;
}
.sp-empty-icon {
  font-size:4rem; display:block;
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}
.sp-empty p {
  font-size:1.2rem; font-weight:700; color:#0f172a; margin:0;
  letter-spacing: -.01em;
}
.sp-empty small {
  font-size:.9rem; color:#78716c; margin: 0;
  max-width: 340px; line-height: 1.5;
}
.sp-empty button {
  margin-top: 8px;
}

/* ── Skeleton ── */
.sp-skeleton-list { padding:12px; display:flex; flex-direction:column; gap:10px; }
.sp-skeleton-card {
  height:114px; border-radius:16px; background:#f4f1eb;
  background:linear-gradient(90deg,#f4f1eb 25%,#ede9e2 50%,#f4f1eb 75%);
  background-size:800px 100%; animation:shimmer 1.6s infinite linear;
}
@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

/* ── RIGHT SIDEBAR ── */
.sp-sidebar-right {
  background: #fff;
  border-left: 1px solid #e9e6e0;
  min-height: 100vh;
  padding: 28px 16px;
  display: flex; flex-direction: column; gap: 20px;
  position: sticky; top: 0; overflow-y: auto; max-height: 100vh;
}

.sp-right-trending { display:flex; flex-direction:column; gap:14px; }

.sp-right-trending-header {
  display:flex; align-items:center; justify-content:space-between;
}
.sp-right-trending-title { font-size:.95rem; font-weight:700; color:#0f172a; }
.sp-see-all {
  font-size:.78rem; font-weight:600; color:#3b82f6; text-decoration:none;
  transition:color .14s;
}
.sp-see-all:hover { color:#1d4ed8; }

/* ── Trending big card ── */
.sp-trending-big { display:block; text-decoration:none; border-radius:16px; overflow:hidden; }
.sp-trending-big-img { position:relative; height:180px; }
.sp-trending-big-img img { width:100%; height:100%; object-fit:cover; display:block; }

.sp-trending-big-overlay {
  position:absolute; inset:0;
  background:linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 50%);
  padding:14px; display:flex; flex-direction:column; justify-content:flex-end;
}

.sp-trending-fire { font-size:1.1rem; position:absolute; top:10px; left:12px; }

.sp-trending-big-name {
  font-size:.95rem; font-weight:700; color:#fff; margin:0 0 5px;
  line-height:1.2;
}
.sp-trending-big-meta {
  display:flex; gap:10px; flex-wrap:wrap;
}
.sp-trending-big-meta span {
  display:inline-flex; align-items:center; gap:4px;
  font-size:.72rem; color:rgba(255,255,255,.85); font-weight:500;
}

/* ── Trending list card ── */
.sp-trending-list { display:flex; flex-direction:column; gap:10px; }

.sp-trending-card {
  display:flex; align-items:center; gap:12px;
  background:#f8f7f4; border-radius:14px; padding:10px;
  text-decoration:none; transition:background .14s;
}
.sp-trending-card:hover { background:#f0ede6; }

.sp-trending-thumb {
  width:52px; height:52px; border-radius:10px; overflow:hidden;
  flex-shrink:0; background:#e5e2db;
}
.sp-trending-thumb img { width:100%; height:100%; object-fit:cover; display:block; }

.sp-trending-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.sp-trending-name { font-size:.84rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sp-trending-meta { display:flex; gap:8px; }
.sp-trending-meta span {
  display:inline-flex; align-items:center; gap:3px;
  font-size:.72rem; color:#78716c;
}
.sp-trending-likes {
  display:inline-flex; align-items:center; gap:3px;
  font-size:.78rem; font-weight:700; color:#ef4444; white-space:nowrap;
}

/* ── Right stats ── */
.sp-right-stats {
  background:#f8f7f4; border-radius:16px; padding:16px;
}
.sp-activity-row { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }
.sp-activity-item {
  display:flex; flex-direction:column; align-items:center; gap:2px;
  padding:10px 4px;
}
.sp-activity-item strong { font-size:1.3rem; font-weight:800; color:#0f172a; }
.sp-activity-item span { font-size:.72rem; color:#a8a29e; font-weight:500; }

/* ── Responsive ── */
@media (max-width:1200px) {
  .sp-root { grid-template-columns: 200px minmax(0,1fr) 240px; }
}
@media (max-width:1024px) {
  .sp-root { grid-template-columns: 1fr; }
  .sp-sidebar-left, .sp-sidebar-right {
    display:none;
  }
  .sp-stats { grid-template-columns:repeat(2,1fr); }
}
@media (max-width:600px) {
  .sp-main { padding:20px 16px 40px; }
  .sp-stats { grid-template-columns:1fr 1fr; }
  .sp-headline { font-size:1.8rem; }
}
`

export default StudentsPage
