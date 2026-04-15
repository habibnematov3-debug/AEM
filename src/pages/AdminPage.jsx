import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  deleteAdminEvent,
  deleteAdminEvents,
  fetchAdminEvents,
  sendAdminReminderBatch,
} from '../api/aemApi'
import { getLanguageLocale } from '../i18n/translations'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/admin.css'

const DONUT_SIZE = 228
const DONUT_STROKE = 28
const TIMELINE_WIDTH = 900
const TIMELINE_HEIGHT = 300
const TIMELINE_PADDING_X = 40
const TIMELINE_PADDING_TOP = 20
const TIMELINE_PADDING_BOTTOM = 46

function formatEventDate(eventDate, fallback, languageCode) {
  if (!eventDate) {
    return fallback
  }

  const parsedDate = new Date(`${eventDate}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback || eventDate
  }

  return parsedDate.toLocaleDateString(getLanguageLocale(languageCode), {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatWeekdayLabel(dateValue, languageCode) {
  if (!dateValue) {
    return ''
  }

  const parsedDate = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue
  }

  return parsedDate.toLocaleDateString(getLanguageLocale(languageCode), {
    weekday: 'short',
  })
}

function clampPercentage(value) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

function buildLinePoints(values, width, height, paddingX, paddingTop, paddingBottom, maxValue) {
  if (!values.length) {
    return []
  }

  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingTop - paddingBottom
  const denominator = Math.max(values.length - 1, 1)

  return values.map((value, index) => {
    const x = paddingX + (innerWidth / denominator) * index
    const y = paddingTop + innerHeight - (value / maxValue) * innerHeight

    return {
      x,
      y,
      value,
    }
  })
}

function buildLinePath(points) {
  if (!points.length) {
    return ''
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
}

function buildAreaPath(points, height, paddingBottom) {
  if (!points.length) {
    return ''
  }

  const baselineY = height - paddingBottom
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  return [
    `M ${firstPoint.x} ${baselineY}`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
    `L ${lastPoint.x} ${baselineY}`,
    'Z',
  ].join(' ')
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeSemiCirclePath(cx, cy, radius) {
  const start = polarToCartesian(cx, cy, radius, 270)
  const end = polarToCartesian(cx, cy, radius, 90)

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`
}

function DonutChart({ segments, totalValue, totalLabel }) {
  const radius = (DONUT_SIZE - DONUT_STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const drawableSegments = segments.filter((segment) => segment.value > 0)
  let currentOffset = 0

  return (
    <div className="admin-page__donut-visual">
      <svg viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} aria-hidden="true">
        <g transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}>
          <circle
            cx={DONUT_SIZE / 2}
            cy={DONUT_SIZE / 2}
            r={radius}
            className="admin-page__donut-track"
          />
          {drawableSegments.map((segment) => {
            const segmentLength = circumference * (segment.value / Math.max(totalValue, 1))
            const dasharray = `${segmentLength} ${circumference - segmentLength}`
            const circle = (
              <circle
                key={segment.key}
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={radius}
                className="admin-page__donut-segment"
                stroke={segment.color}
                strokeDasharray={dasharray}
                strokeDashoffset={-currentOffset}
              />
            )

            currentOffset += segmentLength
            return circle
          })}
        </g>
      </svg>

      <div className="admin-page__donut-center">
        <strong>{totalValue}</strong>
        <span>{totalLabel}</span>
      </div>
    </div>
  )
}

function TimelineChart({ data, languageCode, joinsLabel, checkInsLabel }) {
  const maxObservedValue = Math.max(
    5,
    ...data.flatMap((point) => [point.joins, point.checkIns]),
  )
  const yAxisMax = maxObservedValue <= 5 ? 5 : Math.ceil(maxObservedValue / 5) * 5
  const joinsPoints = buildLinePoints(
    data.map((point) => point.joins),
    TIMELINE_WIDTH,
    TIMELINE_HEIGHT,
    TIMELINE_PADDING_X,
    TIMELINE_PADDING_TOP,
    TIMELINE_PADDING_BOTTOM,
    yAxisMax,
  )
  const checkInPoints = buildLinePoints(
    data.map((point) => point.checkIns),
    TIMELINE_WIDTH,
    TIMELINE_HEIGHT,
    TIMELINE_PADDING_X,
    TIMELINE_PADDING_TOP,
    TIMELINE_PADDING_BOTTOM,
    yAxisMax,
  )
  const tickValues = Array.from({ length: 6 }, (_, index) => Math.round((yAxisMax / 5) * (5 - index)))
  const innerHeight = TIMELINE_HEIGHT - TIMELINE_PADDING_TOP - TIMELINE_PADDING_BOTTOM

  return (
    <div className="admin-page__timeline-chart">
      <div className="admin-page__legend">
        <span className="admin-page__legend-item">
          <span className="admin-page__legend-swatch admin-page__legend-swatch--blue" />
          {joinsLabel}
        </span>
        <span className="admin-page__legend-item">
          <span className="admin-page__legend-swatch admin-page__legend-swatch--teal" />
          {checkInsLabel}
        </span>
      </div>

      <svg viewBox={`0 0 ${TIMELINE_WIDTH} ${TIMELINE_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="admin-joins-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(76, 156, 255, 0.3)" />
            <stop offset="100%" stopColor="rgba(76, 156, 255, 0.02)" />
          </linearGradient>
          <linearGradient id="admin-checkins-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(51, 197, 161, 0.22)" />
            <stop offset="100%" stopColor="rgba(51, 197, 161, 0.02)" />
          </linearGradient>
        </defs>

        {tickValues.map((tickValue, index) => {
          const y = TIMELINE_PADDING_TOP + (innerHeight / 5) * index

          return (
            <g key={tickValue}>
              <line
                x1={TIMELINE_PADDING_X}
                y1={y}
                x2={TIMELINE_WIDTH - TIMELINE_PADDING_X}
                y2={y}
                className="admin-page__timeline-grid-line"
              />
              <text x={TIMELINE_PADDING_X - 10} y={y + 4} className="admin-page__timeline-axis-label">
                {tickValue}
              </text>
            </g>
          )
        })}

        {joinsPoints.map((point, index) => (
          <line
            key={`vertical-${data[index]?.date ?? index}`}
            x1={point.x}
            y1={TIMELINE_PADDING_TOP}
            x2={point.x}
            y2={TIMELINE_HEIGHT - TIMELINE_PADDING_BOTTOM}
            className="admin-page__timeline-vertical-line"
          />
        ))}

        <path d={buildAreaPath(joinsPoints, TIMELINE_HEIGHT, TIMELINE_PADDING_BOTTOM)} fill="url(#admin-joins-fill)" />
        <path d={buildAreaPath(checkInPoints, TIMELINE_HEIGHT, TIMELINE_PADDING_BOTTOM)} fill="url(#admin-checkins-fill)" />
        <path d={buildLinePath(joinsPoints)} className="admin-page__timeline-line admin-page__timeline-line--blue" />
        <path d={buildLinePath(checkInPoints)} className="admin-page__timeline-line admin-page__timeline-line--teal" />

        {joinsPoints.map((point, index) => (
          <g key={`joins-${data[index]?.date ?? index}`}>
            <circle cx={point.x} cy={point.y} r="5.5" className="admin-page__timeline-point admin-page__timeline-point--blue" />
            <text x={point.x} y={TIMELINE_HEIGHT - 12} textAnchor="middle" className="admin-page__timeline-day-label">
              {formatWeekdayLabel(data[index]?.date, languageCode)}
            </text>
          </g>
        ))}

        {checkInPoints.map((point, index) => (
          <circle
            key={`checkins-${data[index]?.date ?? index}`}
            cx={point.x}
            cy={point.y}
            r="5.5"
            className="admin-page__timeline-point admin-page__timeline-point--teal"
          />
        ))}
      </svg>
    </div>
  )
}

function GaugeChart({ value, subtitle }) {
  const gaugeValue = clampPercentage(value)
  const width = 220
  const height = 138
  const radius = 84
  const path = describeSemiCirclePath(width / 2, 118, radius)
  const semiCircumference = Math.PI * radius

  return (
    <div className="admin-page__gauge-chart">
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <path d={path} className="admin-page__gauge-track" pathLength={semiCircumference} />
        <path
          d={path}
          className="admin-page__gauge-progress"
          pathLength={semiCircumference}
          strokeDasharray={`${(semiCircumference * gaugeValue) / 100} ${semiCircumference}`}
        />
      </svg>
      <div className="admin-page__gauge-center">
        <strong>{gaugeValue}%</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  )
}

function AdminPage({ currentUser, onModerateEvent, onLoadStats }) {
  const { languageCode, t } = useI18n()
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [recentParticipations, setRecentParticipations] = useState([])
  const [activityTimeline, setActivityTimeline] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [isDashboardLoading, setIsDashboardLoading] = useState(true)
  const [areEventsLoading, setAreEventsLoading] = useState(true)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [moderatingEventId, setModeratingEventId] = useState('')
  const [deletingEventId, setDeletingEventId] = useState('')
  const [selectedEventIds, setSelectedEventIds] = useState(new Set())
  const [isSendingReminders, setIsSendingReminders] = useState(false)
  const pendingCount = stats?.pending ?? 0
  const selectedCount = selectedEventIds.size
  const allEventsSelected = events.length > 0 && events.every((event) => selectedEventIds.has(event.id))
  const pendingBadgeLabel = pendingCount > 99 ? '99+' : String(pendingCount)

  useEffect(() => {
    let isMounted = true

    async function loadDashboardData() {
      setIsDashboardLoading(true)

      try {
        const dashboardData = await onLoadStats()

        if (!isMounted) {
          return
        }

        setStats(dashboardData.stats)
        setActivityTimeline(dashboardData.activityTimeline)
        setRecentEvents(dashboardData.recentEvents)
        setRecentUsers(dashboardData.recentUsers)
        setRecentParticipations(dashboardData.recentParticipations)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setFeedback({
          type: 'error',
          message: error.message || t('adminPage.loadError'),
        })
      } finally {
        if (isMounted) {
          setIsDashboardLoading(false)
        }
      }
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [onLoadStats, t])

  useEffect(() => {
    let isMounted = true

    async function loadAdminEvents() {
      setAreEventsLoading(true)

      try {
        const adminEvents = await fetchAdminEvents({
          status: statusFilter === 'all' ? '' : statusFilter,
          query: deferredSearchQuery,
        })

        if (!isMounted) {
          return
        }

        setEvents(adminEvents)
        setSelectedEventIds(new Set())
      } catch (error) {
        if (!isMounted) {
          return
        }

        setFeedback({
          type: 'error',
          message: error.message || t('adminPage.loadError'),
        })
      } finally {
        if (isMounted) {
          setAreEventsLoading(false)
        }
      }
    }

    loadAdminEvents()

    return () => {
      isMounted = false
    }
  }, [deferredSearchQuery, statusFilter, t])

  const approvalRate = useMemo(() => {
    if (!stats?.events) {
      return 0
    }

    return clampPercentage((stats.approved / stats.events) * 100)
  }, [stats])

  const completionRate = useMemo(() => {
    if (!stats?.approved) {
      return 0
    }

    return clampPercentage((stats.finished / stats.approved) * 100)
  }, [stats])

  const attendanceRate = useMemo(() => {
    const completedParticipationCount = (stats?.attended ?? 0) + (stats?.noShows ?? 0)

    if (!completedParticipationCount) {
      return 0
    }

    return clampPercentage(((stats?.attended ?? 0) / completedParticipationCount) * 100)
  }, [stats])

  const missRate = useMemo(() => {
    const completedParticipationCount = (stats?.attended ?? 0) + (stats?.noShows ?? 0)

    if (!completedParticipationCount) {
      return 0
    }

    return clampPercentage(((stats?.noShows ?? 0) / completedParticipationCount) * 100)
  }, [stats])

  const activeEvents = (stats?.upcoming ?? 0) + (stats?.inProgress ?? 0)

  const snapshotCards = useMemo(
    () =>
      stats
        ? [
            {
              key: 'users',
              label: t('adminPage.stats.users'),
              value: stats.users,
              note: t('adminPage.snapshotUsersNote'),
              tone: 'blue',
            },
            {
              key: 'events',
              label: t('adminPage.stats.events'),
              value: stats.events,
              note: t('adminPage.snapshotEventsNote'),
              tone: 'violet',
            },
            {
              key: 'approved',
              label: t('adminPage.stats.approved'),
              value: stats.approved,
              note: t('adminPage.snapshotApprovedNote', { rate: approvalRate }),
              tone: 'lime',
            },
            {
              key: 'attended',
              label: t('adminPage.stats.attended'),
              value: stats.attended,
              note: t('adminPage.snapshotAttendedNote'),
              tone: 'teal',
            },
            {
              key: 'waitlisted',
              label: t('adminPage.stats.waitlisted'),
              value: stats.waitlisted,
              note: t('adminPage.snapshotWaitlistedNote'),
              tone: 'amber',
            },
            {
              key: 'noShows',
              label: t('adminPage.stats.noShows'),
              value: stats.noShows,
              note: t('adminPage.snapshotNoShowsNote', { rate: missRate }),
              tone: 'red',
            },
          ]
        : [],
    [approvalRate, missRate, stats, t],
  )

  const statusBreakdown = useMemo(
    () =>
      stats
        ? [
            {
              key: 'approved',
              label: t('adminPage.breakdownApproved'),
              value: stats.approved,
              color: '#7cc321',
            },
            {
              key: 'finished',
              label: t('adminPage.breakdownFinished'),
              value: stats.finished,
              color: '#33c5a1',
            },
            {
              key: 'pending',
              label: t('adminPage.breakdownPending'),
              value: stats.pending,
              color: '#d18b1f',
            },
            {
              key: 'rejected',
              label: t('adminPage.breakdownRejected'),
              value: stats.rejected,
              color: '#ef5b5b',
            },
          ]
        : [],
    [stats, t],
  )

  const participationFunnel = useMemo(
    () =>
      stats
        ? [
            {
              key: 'joined',
              label: t('adminPage.funnelJoined'),
              value: stats.joined,
              color: '#4c9cff',
            },
            {
              key: 'attended',
              label: t('adminPage.funnelAttended'),
              value: stats.attended,
              color: '#7cc321',
            },
            {
              key: 'noShows',
              label: t('adminPage.funnelNoShow'),
              value: stats.noShows,
              color: '#ef5b5b',
            },
            {
              key: 'waitlisted',
              label: t('adminPage.funnelWaitlist'),
              value: stats.waitlisted,
              color: '#d18b1f',
            },
          ]
        : [],
    [stats, t],
  )

  const lifecycleSegments = useMemo(
    () =>
      stats
        ? [
            {
              key: 'active',
              label: t('adminPage.lifecycleActive'),
              value: stats.upcoming,
              color: '#4c9cff',
            },
            {
              key: 'finished',
              label: t('adminPage.lifecycleFinished'),
              value: stats.finished,
              color: '#8b7cf6',
            },
            {
              key: 'inProgress',
              label: t('adminPage.lifecycleInProgress'),
              value: stats.inProgress,
              color: '#d18b1f',
            },
          ]
        : [],
    [stats, t],
  )

  const lifecycleMax = Math.max(
    1,
    lifecycleSegments.reduce((sum, segment) => sum + segment.value, 0),
  )
  const lifecycleTicks = Array.from({ length: 6 }, (_, index) => Math.round((lifecycleMax / 5) * (5 - index)))
  const funnelMax = Math.max(1, ...participationFunnel.map((item) => item.value))
  const totalStatusCount = statusBreakdown.reduce((sum, segment) => sum + segment.value, 0)

  async function handleModeration(eventId, moderationStatus) {
    setModeratingEventId(eventId)
    setFeedback({ type: '', message: '' })

    try {
      const result = await onModerateEvent(eventId, moderationStatus)
      setStats(result.stats)
      setEvents((currentEvents) =>
        currentEvents.map((event) => (event.id === result.event.id ? result.event : event)),
      )
      setRecentEvents((currentEvents) =>
        currentEvents.map((event) => (event.id === result.event.id ? result.event : event)),
      )
      setSelectedEventIds((currentSelected) => {
        const next = new Set(currentSelected)
        next.delete(eventId)
        return next
      })
      setFeedback({
        type: 'success',
        message:
          moderationStatus === 'approved'
            ? t('adminPage.approveSuccess')
            : t('adminPage.rejectSuccess'),
      })

      if (statusFilter !== 'all' && statusFilter !== moderationStatus) {
        setEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId))
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.moderationError'),
      })
    } finally {
      setModeratingEventId('')
    }
  }

  async function handleDeleteEvent(eventId) {
    if (!window.confirm(t('adminPage.deleteConfirm'))) {
      return
    }

    setDeletingEventId(eventId)
    setFeedback({ type: '', message: '' })

    try {
      const result = await deleteAdminEvent(eventId)
      setStats(result.stats)
      setEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId))
      setRecentEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId))
      setSelectedEventIds((currentSelected) => {
        const next = new Set(currentSelected)
        next.delete(eventId)
        return next
      })
      setFeedback({
        type: 'success',
        message: t('adminPage.deleteSuccess'),
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.deleteError'),
      })
    } finally {
      setDeletingEventId('')
    }
  }

  async function handleSendReminders() {
    setIsSendingReminders(true)
    setFeedback({ type: '', message: '' })

    try {
      const result = await sendAdminReminderBatch({ hoursAhead: 24 })
      setFeedback({
        type: 'success',
        message: result.message || t('adminPage.remindersSuccess', { count: result.sentCount }),
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.remindersError'),
      })
    } finally {
      setIsSendingReminders(false)
    }
  }

  function handleToggleEventSelection(eventId) {
    setSelectedEventIds((currentSelected) => {
      const next = new Set(currentSelected)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  function handleToggleSelectAll() {
    setSelectedEventIds((currentSelected) => {
      if (events.length > 0 && events.every((event) => currentSelected.has(event.id))) {
        return new Set()
      }
      return new Set(events.map((event) => event.id))
    })
  }

  async function handleBulkDelete() {
    if (!selectedCount) {
      return
    }

    if (!window.confirm(t('adminPage.deleteSelectedConfirm', { count: selectedCount }))) {
      return
    }

    setDeletingEventId('bulk')
    setFeedback({ type: '', message: '' })

    try {
      const result = await deleteAdminEvents(Array.from(selectedEventIds))
      setStats(result.stats)
      setEvents((currentEvents) => currentEvents.filter((event) => !selectedEventIds.has(event.id)))
      setRecentEvents((currentEvents) =>
        currentEvents.filter((event) => !selectedEventIds.has(event.id)),
      )
      setSelectedEventIds(new Set())
      setFeedback({
        type: 'success',
        message: t('adminPage.deleteSelectedSuccess', { count: selectedCount }),
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.deleteSelectedError'),
      })
    } finally {
      setDeletingEventId('')
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page__intro" data-tour="admin-intro">
        <div>
          <p className="admin-page__eyebrow">{t('adminPage.eyebrow')}</p>
          <h1>{t('adminPage.title')}</h1>
          <p>{t('adminPage.subtitle', { name: currentUser?.name ?? 'Admin' })}</p>
        </div>

        <div className="admin-page__intro-actions">
          <button
            type="button"
            className="admin-page__action-button admin-page__action-button--ghost"
            onClick={handleSendReminders}
            disabled={isSendingReminders}
          >
            {isSendingReminders ? t('adminPage.sendingReminders') : t('adminPage.sendReminders')}
          </button>
          <Link
            to="/admin/users"
            className="admin-page__action-button"
            data-tour="admin-manage-users"
          >
            {t('adminPage.manageUsers')}
          </Link>
        </div>
      </div>

      {feedback.message ? (
        <div
          className={
            feedback.type === 'error'
              ? 'admin-page__feedback admin-page__feedback--error'
              : 'admin-page__feedback admin-page__feedback--success'
          }
        >
          {feedback.message}
        </div>
      ) : null}

      {isDashboardLoading && !stats ? (
        <div className="admin-page__empty admin-page__empty--analytics">
          <h3>{t('adminPage.loadingTitle')}</h3>
          <p>{t('adminPage.loadingDescription')}</p>
        </div>
      ) : stats ? (
        <div className="admin-page__analytics" data-tour="admin-stats">
          <div className="admin-page__snapshot-header">
            <div>
              <p className="admin-page__section-label">{t('adminPage.snapshotEyebrow')}</p>
              <h2>{t('adminPage.snapshotTitle')}</h2>
            </div>
          </div>

          <div className="admin-page__snapshot-grid">
            {snapshotCards.map((card) => (
              <article key={card.key} className={`admin-page__snapshot-card admin-page__snapshot-card--${card.tone}`}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
              </article>
            ))}
          </div>

          <div className="admin-page__visual-grid">
            <article className="admin-page__viz-card">
              <div className="admin-page__viz-card-top">
                <h3>{t('adminPage.breakdownTitle')}</h3>
              </div>

              <div className="admin-page__legend">
                {statusBreakdown.map((segment) => (
                  <span key={segment.key} className="admin-page__legend-item">
                    <span className="admin-page__legend-swatch" style={{ backgroundColor: segment.color }} />
                    {segment.label} {segment.value}
                  </span>
                ))}
              </div>

              <div className="admin-page__status-breakdown">
                <DonutChart
                  segments={statusBreakdown}
                  totalValue={totalStatusCount}
                  totalLabel={t('common.events').toLowerCase()}
                />

                <div className="admin-page__metric-list">
                  <div>
                    <span>{t('adminPage.approvalRateLabel')}</span>
                    <strong>{approvalRate}%</strong>
                  </div>
                  <div>
                    <span>{t('adminPage.completionRateLabel')}</span>
                    <strong>{completionRate}%</strong>
                  </div>
                  <div>
                    <span>{t('adminPage.activeEventsLabel')}</span>
                    <strong>{activeEvents}</strong>
                  </div>
                </div>
              </div>
            </article>

            <article className="admin-page__viz-card">
              <div className="admin-page__viz-card-top">
                <h3>{t('adminPage.funnelTitle')}</h3>
              </div>

              <div className="admin-page__legend">
                {participationFunnel.map((item) => (
                  <span key={item.key} className="admin-page__legend-item">
                    <span className="admin-page__legend-swatch" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>

              <div className="admin-page__funnel-chart">
                {participationFunnel.map((item) => (
                  <div key={item.key} className="admin-page__funnel-row">
                    <span className="admin-page__funnel-label">{item.label}</span>
                    <div className="admin-page__funnel-track">
                      <span
                        className="admin-page__funnel-bar"
                        style={{
                          width: `${(item.value / funnelMax) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                      <span className="admin-page__funnel-value">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
