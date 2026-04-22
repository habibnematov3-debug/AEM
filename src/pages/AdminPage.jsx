import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  deleteAdminEvent,
  deleteAdminEvents,
  fetchAdminBroadcasts,
  fetchAdminBroadcastDetail,
  fetchAdminEvents,
  sendAdminReminderBatch,
} from '../api/aemApi'
import MessageAnalytics from '../components/admin/MessageAnalytics'
import MessageComposer from '../components/admin/MessageComposer'
import MessageHistory from '../components/admin/MessageHistory'
import RejectionModal from '../components/admin/RejectionModal'
import ParticipantModal from '../components/admin/ParticipantModal'
import { getLanguageLocale } from '../i18n/translations'
import { useI18n } from '../i18n/LanguageContext'
import '../styles/admin.css'
import '../styles/admin-broadcast.css'
import '../styles/rejection-modal.css'
import '../styles/participant-modal.css'

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
  const [broadcasts, setBroadcasts] = useState([])
  const [broadcastsLoading, setBroadcastsLoading] = useState(true)
  const [selectedBroadcastId, setSelectedBroadcastId] = useState('')
  const [broadcastAnalytics, setBroadcastAnalytics] = useState({
    broadcast: null,
    analytics: { deliveries: 0, readReceipts: 0, emailsSent: 0 },
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false)
  const [rejectionEventId, setRejectionEventId] = useState(null)
  const [rejectionEventTitle, setRejectionEventTitle] = useState('')
  const [participantModalOpen, setParticipantModalOpen] = useState(false)
  const [participantModalEvent, setParticipantModalEvent] = useState(null)
  const pendingCount = stats?.pending ?? 0
  const selectedCount = selectedEventIds.size
  const allEventsSelected = events.length > 0 && events.every((event) => selectedEventIds.has(event.id))
  const pendingBadgeLabel = pendingCount > 99 ? '99+' : String(pendingCount)

  const loadBroadcasts = useCallback(async () => {
    setBroadcastsLoading(true)
    setAnalyticsError('')
    try {
      const rows = await fetchAdminBroadcasts()
      setBroadcasts(rows)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || t('adminPage.broadcast.loadError'),
      })
    } finally {
      setBroadcastsLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadBroadcasts()
  }, [loadBroadcasts])

  useEffect(() => {
    let isMounted = true

    if (!selectedBroadcastId) {
      setBroadcastAnalytics({
        broadcast: null,
        analytics: { deliveries: 0, readReceipts: 0, emailsSent: 0 },
      })
      setAnalyticsLoading(false)
      setAnalyticsError('')
      return undefined
    }

    async function loadAnalytics() {
      setAnalyticsLoading(true)
      setAnalyticsError('')
      try {
        const detail = await fetchAdminBroadcastDetail(selectedBroadcastId)
        if (!isMounted) {
          return
        }
        setBroadcastAnalytics(detail)
      } catch (error) {
        if (!isMounted) {
          return
        }
        setAnalyticsError(error.message || t('adminPage.broadcast.loadError'))
      } finally {
        if (isMounted) {
          setAnalyticsLoading(false)
        }
      }
    }

    loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [selectedBroadcastId, t])

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
    // If rejecting, show the rejection modal first
    if (moderationStatus === 'rejected') {
      const event = events.find((e) => e.id === eventId)
      if (event) {
        setRejectionEventId(eventId)
        setRejectionEventTitle(event.title)
        setRejectionModalOpen(true)
      }
      return
    }

    // For approval, proceed directly
    setModeratingEventId(eventId)
    setFeedback({ type: '', message: '' })

    try {
      const result = await onModerateEvent(eventId, moderationStatus, '')
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
        message: t('adminPage.approveSuccess'),
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

  async function handleConfirmRejection(rejectionReason) {
    setModeratingEventId(rejectionEventId)
    setFeedback({ type: '', message: '' })

    try {
      const result = await onModerateEvent(rejectionEventId, 'rejected', rejectionReason)
      setStats(result.stats)
      setEvents((currentEvents) =>
        currentEvents.map((event) => (event.id === result.event.id ? result.event : event)),
      )
      setRecentEvents((currentEvents) =>
        currentEvents.map((event) => (event.id === result.event.id ? result.event : event)),
      )
      setSelectedEventIds((currentSelected) => {
        const next = new Set(currentSelected)
        next.delete(rejectionEventId)
        return next
      })
      setFeedback({
        type: 'success',
        message: t('adminPage.rejectSuccess'),
      })

      if (statusFilter !== 'all' && statusFilter !== 'rejected') {
        setEvents((currentEvents) =>
          currentEvents.filter((event) => event.id !== rejectionEventId),
        )
      }

      setRejectionModalOpen(false)
      setRejectionEventId(null)
      setRejectionEventTitle('')
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
    const eventToDelete = events.find((e) => e.id === eventId)
    if (!eventToDelete) {
      return
    }

    // Build confirmation message
    const hasParticipants = (eventToDelete.joinedCount || 0) > 0 || (eventToDelete.waitlistedCount || 0) > 0
    const participantWarning = hasParticipants 
      ? `\n⚠️  WARNING: This event has ${eventToDelete.joinedCount || 0} participant(s) and ${eventToDelete.waitlistedCount || 0} waitlisted.\nThey will be notified of the deletion.`
      : ''

    const confirmMsg = `Are you sure you want to delete this event?\n\n` +
      `Event: ${eventToDelete.title}\n` +
      `Date: ${eventToDelete.eventDate}\n` +
      `Status: ${eventToDelete.moderationStatus}${participantWarning}\n\n` +
      `This action cannot be undone.`

    if (!window.confirm(confirmMsg)) {
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

  function handleOpenParticipantModal(event) {
    setParticipantModalEvent(event)
    setParticipantModalOpen(true)
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
      // Check if it's a bulk delete error with blocked events
      const payload = error.payload || {}
      if (payload.blocked_events && payload.blocked_events.length > 0) {
        const blockedCount = payload.blocked_events.length
        const blockedTitles = payload.blocked_events.slice(0, 3).map((e) => `"${e.title}"`).join(', ')
        const moreText = blockedCount > 3 ? ` and ${blockedCount - 3} more` : ''
        setFeedback({
          type: 'error',
          message: `Cannot delete ${blockedCount} active event(s): ${blockedTitles}${moreText}. Please wait until they are finished.`,
        })
      } else {
        setFeedback({
          type: 'error',
          message: error.message || t('adminPage.deleteSelectedError'),
        })
      }
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

      <div className="admin-broadcast" data-tour="admin-broadcast">
        <div className="admin-broadcast__header">
          <p className="admin-page__section-label">{t('adminPage.broadcast.sectionEyebrow')}</p>
          <h2>{t('adminPage.broadcast.sectionTitle')}</h2>
          <p>{t('adminPage.broadcast.sectionSubtitle')}</p>
        </div>
        <div className="admin-broadcast__layout">
          <MessageComposer
            t={t}
            onSent={async () => {
              setFeedback({ type: 'success', message: t('adminPage.broadcast.sentSuccess') })
              await loadBroadcasts()
            }}
          />
          <div className="admin-broadcast__side">
            <MessageHistory
              t={t}
              broadcasts={broadcasts}
              selectedId={selectedBroadcastId}
              onSelect={(id) => setSelectedBroadcastId(String(id))}
              isLoading={broadcastsLoading}
            />
            <MessageAnalytics
              t={t}
              detail={broadcastAnalytics.broadcast}
              analytics={broadcastAnalytics.analytics}
              isLoading={analyticsLoading}
              errorMessage={analyticsError}
            />
          </div>
        </div>
      </div>

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

          <article className="admin-page__viz-card admin-page__viz-card--timeline">
            <div className="admin-page__viz-card-top">
              <h3>{t('adminPage.timelineTitle')}</h3>
            </div>
            <TimelineChart
              data={activityTimeline}
              languageCode={languageCode}
              joinsLabel={t('adminPage.timelineJoins')}
              checkInsLabel={t('adminPage.timelineCheckIns')}
            />
          </article>

          <div className="admin-page__visual-grid admin-page__visual-grid--compact">
            <article className="admin-page__viz-card">
              <div className="admin-page__viz-card-top">
                <h3>{t('adminPage.attendanceRateTitle')}</h3>
              </div>
              <GaugeChart value={attendanceRate} subtitle={t('adminPage.attendanceRateSubtitle')} />
            </article>

            <article className="admin-page__viz-card">
              <div className="admin-page__viz-card-top">
                <h3>{t('adminPage.lifecycleTitle')}</h3>
              </div>

              <div className="admin-page__legend">
                {lifecycleSegments.map((segment) => (
                  <span key={segment.key} className="admin-page__legend-item">
                    <span className="admin-page__legend-swatch" style={{ backgroundColor: segment.color }} />
                    {segment.label}
                  </span>
                ))}
              </div>

              <div className="admin-page__lifecycle-chart">
                <div className="admin-page__lifecycle-axis">
                  {lifecycleTicks.map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className="admin-page__lifecycle-plot">
                  <div className="admin-page__lifecycle-grid">
                    {lifecycleTicks.map((tick) => (
                      <span key={tick} />
                    ))}
                  </div>
                  <div className="admin-page__lifecycle-bar">
                    {lifecycleSegments.map((segment) => (
                      <span
                        key={segment.key}
                        style={{
                          height: `${(segment.value / lifecycleMax) * 100}%`,
                          backgroundColor: segment.color,
                        }}
                      />
                    ))}
                  </div>
                  <div className="admin-page__lifecycle-label">{t('common.events')}</div>
                </div>
              </div>
            </article>
          </div>

          <div className="admin-page__highlights">
            <article className="admin-page__highlight-card">
              <div className="admin-page__highlight-top">
                <h3>{t('adminPage.recentEventsTitle')}</h3>
              </div>
              {recentEvents.length ? (
                <ul className="admin-page__highlight-list">
                  {recentEvents.map((event) => (
                    <li key={event.id}>
                      <div>
                        <strong>{event.title}</strong>
                        <span>{event.creatorName}</span>
                      </div>
                      <span>{formatEventDate(event.eventDate, event.date, languageCode)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-page__highlight-empty">{t('adminPage.noRecentEvents')}</p>
              )}
            </article>

            <article className="admin-page__highlight-card">
              <div className="admin-page__highlight-top">
                <h3>{t('adminPage.recentUsersTitle')}</h3>
              </div>
              {recentUsers.length ? (
                <ul className="admin-page__highlight-list">
                  {recentUsers.map((user) => (
                    <li key={user.id}>
                      <div>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </div>
                      <span>{t(`adminUsersPage.roles.${user.role}`)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-page__highlight-empty">{t('adminPage.noRecentUsers')}</p>
              )}
            </article>

            <article className="admin-page__highlight-card">
              <div className="admin-page__highlight-top">
                <h3>{t('adminPage.recentActivityTitle')}</h3>
              </div>
              {recentParticipations.length ? (
                <ul className="admin-page__highlight-list">
                  {recentParticipations.map((participation) => (
                    <li key={participation.id}>
                      <div>
                        <strong>{participation.userName}</strong>
                        <span>{participation.eventTitle}</span>
                      </div>
                      <span>
                        {new Date(participation.joinedAt).toLocaleDateString(getLanguageLocale(languageCode))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-page__highlight-empty">{t('adminPage.noRecentActivity')}</p>
              )}
            </article>
          </div>
        </div>
      ) : null}

      <div className="admin-page__panel">
        <div className="admin-page__panel-top" data-tour="admin-moderation">
          <div>
            <p className="admin-page__section-label">{t('adminPage.moderationEyebrow')}</p>
            <div className="admin-page__panel-heading">
              <h2>{t('adminPage.moderationTitle')}</h2>
              {pendingCount > 0 ? (
                <span className="admin-page__pending-pill">
                  {t('adminPage.pendingAlert', { count: pendingBadgeLabel })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="admin-page__controls">
            <label className="admin-page__search">
              <span className="sr-only">{t('common.search')}</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('adminPage.searchPlaceholder')}
              />
            </label>

            <div className="admin-page__filters">
              {['pending', 'approved', 'rejected', 'all'].map((filterValue) => (
                <button
                  key={filterValue}
                  type="button"
                  className={
                    filterValue === statusFilter
                      ? 'admin-page__filter admin-page__filter--active'
                      : 'admin-page__filter'
                  }
                  onClick={() => setStatusFilter(filterValue)}
                >
                  <span>{t(`adminPage.filters.${filterValue}`)}</span>
                  {filterValue === 'pending' && pendingCount > 0 ? (
                    <span className="admin-page__filter-badge">{pendingBadgeLabel}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {events.length ? (
          <div className="admin-page__bulk-actions">
            <label className="admin-page__bulk-select">
              <input
                type="checkbox"
                checked={allEventsSelected}
                onChange={handleToggleSelectAll}
              />
              <span>{t('adminPage.selectAll')}</span>
            </label>

            <button
              type="button"
              className="admin-page__delete-selected-button"
              disabled={selectedCount === 0 || deletingEventId === 'bulk'}
              onClick={handleBulkDelete}
            >
              {deletingEventId === 'bulk'
                ? t('adminPage.deleting')
                : t('adminPage.deleteSelected', { count: selectedCount })}
            </button>
          </div>
        ) : null}

        {areEventsLoading ? (
          <div className="admin-page__empty">
            <h3>{t('adminPage.loadingTitle')}</h3>
            <p>{t('adminPage.loadingDescription')}</p>
          </div>
        ) : events.length ? (
          <div className="admin-page__events">
            {events.map((event) => (
              <article
                key={event.id}
                className={`admin-page__event-card ${selectedEventIds.has(event.id) ? 'admin-page__event-card--selected' : ''}`}
              >
                <div className="admin-page__event-media">
                  <img src={event.image} alt={event.title} />
                </div>

                <div className="admin-page__event-content">
                  <div className="admin-page__event-topline">
                    <label className="admin-page__event-select">
                      <input
                        type="checkbox"
                        checked={selectedEventIds.has(event.id)}
                        onChange={() => handleToggleEventSelection(event.id)}
                      />
                      <span>{t('adminPage.selectEvent')}</span>
                    </label>
                    <span className="admin-page__event-category">{event.category}</span>
                    <span className={`admin-page__event-status admin-page__event-status--${event.moderationStatus}`}>
                      {t(`adminPage.statuses.${event.moderationStatus}`)}
                    </span>
                  </div>

                  <h3>{event.title}</h3>
                  <p className="admin-page__event-description">{event.description}</p>

                  <dl className="admin-page__event-meta">
                    <div>
                      <dt>{t('common.organizer')}</dt>
                      <dd>{event.creatorName}</dd>
                    </div>
                    <div>
                      <dt>{t('common.date')}</dt>
                      <dd>{formatEventDate(event.eventDate, event.date, languageCode)}</dd>
                    </div>
                    <div>
                      <dt>{t('common.location')}</dt>
                      <dd>{event.location}</dd>
                    </div>
                  </dl>

                  <div className="admin-page__event-actions">
                    <Link to={`/events/${event.id}`} className="admin-page__view-button">
                      {t('eventCard.view')}
                    </Link>

                    <button
                      type="button"
                      className="admin-page__approve-button"
                      disabled={
                        moderatingEventId === event.id ||
                        deletingEventId === event.id ||
                        event.moderationStatus === 'approved'
                      }
                      onClick={() => handleModeration(event.id, 'approved')}
                    >
                      {moderatingEventId === event.id
                        ? t('adminPage.moderating')
                        : t('adminPage.approve')}
                    </button>

                    <button
                      type="button"
                      className="admin-page__reject-button"
                      disabled={
                        moderatingEventId === event.id ||
                        deletingEventId === event.id ||
                        event.moderationStatus === 'rejected'
                      }
                      onClick={() => handleModeration(event.id, 'rejected')}
                    >
                      {moderatingEventId === event.id
                        ? t('adminPage.moderating')
                        : t('adminPage.reject')}
                    </button>

                    <button
                      type="button"
                      className="admin-page__participants-button"
                      onClick={() => handleOpenParticipantModal(event)}
                    >
                      👥 Participants
                    </button>

                    <button
                      type="button"
                      className="admin-page__delete-button"
                      disabled={moderatingEventId === event.id || deletingEventId === event.id}
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      {deletingEventId === event.id
                        ? t('adminPage.deleting')
                        : t('adminPage.delete')}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-page__empty">
            <h3>{t('adminPage.emptyTitle')}</h3>
            <p>{t('adminPage.emptyDescription')}</p>
          </div>
        )}
      </div>

      <RejectionModal
        isOpen={rejectionModalOpen}
        eventTitle={rejectionEventTitle}
        onConfirm={handleConfirmRejection}
        onCancel={() => {
          setRejectionModalOpen(false)
          setRejectionEventId(null)
          setRejectionEventTitle('')
        }}
        isLoading={moderatingEventId === rejectionEventId}
      />

      <ParticipantModal
        isOpen={participantModalOpen}
        event={participantModalEvent}
        onClose={() => {
          setParticipantModalOpen(false)
          setParticipantModalEvent(null)
        }}
        onRemoveParticipant={() => {
          // Optionally refresh event data after removing participant
        }}
      />
    </section>
  )
}

export default AdminPage
