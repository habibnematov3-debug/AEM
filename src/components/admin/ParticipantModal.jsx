import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/LanguageContext'
import '../../styles/participant-modal.css'

function ParticipantModal({ isOpen, event, onClose, onRemoveParticipant, isLoading }) {
  const { t } = useI18n()
  const [participants, setParticipants] = useState([])
  const [summary, setSummary] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [removingParticipationId, setRemovingParticipationId] = useState(null)

  // Filter participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesStatus = !statusFilter || p.status === statusFilter
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [participants, statusFilter, searchQuery])

  const displayCount = filteredParticipants.length
  const totalCount = participants.length

  // Load participants
  useEffect(() => {
    if (!isOpen || !event) {
      return
    }

    async function loadParticipants() {
      setIsLoadingData(true)
      setError('')
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/admin/events/${event.id}/participants/?status=${statusFilter}&q=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('aem-auth-token') || ''}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to load participants')
        }

        const data = await response.json()
        setParticipants(data.participants)
        setSummary(data.summary)
      } catch (err) {
        setError(err.message || 'Error loading participants')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadParticipants()
  }, [isOpen, event, statusFilter, searchQuery])

  async function handleRemoveParticipant(participationId) {
    if (!window.confirm('Are you sure you want to remove this participant?')) {
      return
    }

    setRemovingParticipationId(participationId)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/admin/events/${event.id}/participants/`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('aem-auth-token') || ''}`,
          },
          body: JSON.stringify({ participation_id: participationId }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to remove participant')
      }

      // Remove from local list
      setParticipants((prev) => prev.filter((p) => p.id !== participationId))
      setSummary((prev) => ({
        ...prev,
        total: prev.total - 1,
      }))

      if (onRemoveParticipant) {
        onRemoveParticipant(participationId)
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setRemovingParticipationId(null)
    }
  }

  function downloadCSV() {
    const headers = ['Name', 'Email', 'Status', 'Joined At', 'Checked In At']
    const rows = filteredParticipants.map((p) => [
      p.name,
      p.email,
      p.status,
      new Date(p.joined_at).toLocaleString(),
      p.checked_in_at ? new Date(p.checked_in_at).toLocaleString() : '-',
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `participants-${event?.id || 'export'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="participant-modal__overlay" onClick={onClose}>
      <div className="participant-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="participant-modal__header">
          <h2>Event Participants</h2>
          {event && <p className="participant-modal__subtitle">{event.title}</p>}
          <button
            className="participant-modal__close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="participant-modal__error">
            <p>{error}</p>
          </div>
        )}

        {summary && (
          <div className="participant-modal__summary">
            <div className="participant-modal__summary-item">
              <span className="participant-modal__summary-label">Total</span>
              <span className="participant-modal__summary-value">{summary.total}</span>
            </div>
            <div className="participant-modal__summary-item">
              <span className="participant-modal__summary-label">Joined</span>
              <span className="participant-modal__summary-value">{summary.joined}</span>
            </div>
            <div className="participant-modal__summary-item">
              <span className="participant-modal__summary-label">Attended</span>
              <span className="participant-modal__summary-value participant-modal__summary-value--attended">
                {summary.attended}
              </span>
            </div>
            <div className="participant-modal__summary-item">
              <span className="participant-modal__summary-label">Waitlisted</span>
              <span className="participant-modal__summary-value">{summary.waitlisted}</span>
            </div>
            <div className="participant-modal__summary-item">
              <span className="participant-modal__summary-label">No-Shows</span>
              <span className="participant-modal__summary-value participant-modal__summary-value--noshow">
                {summary.no_shows}
              </span>
            </div>
          </div>
        )}

        <div className="participant-modal__controls">
          <div className="participant-modal__filter-group">
            <select
              className="participant-modal__filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={isLoadingData}
            >
              <option value="">All Statuses</option>
              <option value="joined">Joined</option>
              <option value="attended">Attended</option>
              <option value="no_show">No-Shows</option>
              <option value="waitlisted">Waitlisted</option>
            </select>

            <input
              type="text"
              className="participant-modal__search-input"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoadingData}
            />
          </div>

          <button
            className="participant-modal__export-button"
            onClick={downloadCSV}
            disabled={isLoadingData || filteredParticipants.length === 0}
            type="button"
          >
            📥 Export CSV
          </button>
        </div>

        <div className="participant-modal__content">
          {isLoadingData ? (
            <div className="participant-modal__loading">Loading participants...</div>
          ) : filteredParticipants.length === 0 ? (
            <div className="participant-modal__empty">
              <p>No participants found</p>
            </div>
          ) : (
            <table className="participant-modal__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p) => (
                  <tr key={p.id} className={`participant-modal__row participant-modal__row--${p.status}`}>
                    <td className="participant-modal__cell">{p.name}</td>
                    <td className="participant-modal__cell">{p.email}</td>
                    <td className="participant-modal__cell">
                      <span className={`participant-modal__status participant-modal__status--${p.status}`}>
                        {p.status === 'attended' && '✓ Attended'}
                        {p.status === 'joined' && '👤 Joined'}
                        {p.status === 'no_show' && '✗ No-Show'}
                        {p.status === 'waitlisted' && '⏳ Waitlisted'}
                      </span>
                    </td>
                    <td className="participant-modal__cell participant-modal__cell--date">
                      {new Date(p.joined_at).toLocaleDateString()}
                    </td>
                    <td className="participant-modal__cell participant-modal__cell--action">
                      <button
                        className="participant-modal__remove-button"
                        onClick={() => handleRemoveParticipant(p.id)}
                        disabled={removingParticipationId === p.id || isLoading}
                        type="button"
                        title="Remove participant"
                      >
                        {removingParticipationId === p.id ? '...' : '✕'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalCount > 0 && filteredParticipants.length < totalCount && (
            <p className="participant-modal__filter-info">
              Showing {displayCount} of {totalCount} participants
            </p>
          )}
        </div>

        <div className="participant-modal__footer">
          <button
            className="participant-modal__close-button"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ParticipantModal
