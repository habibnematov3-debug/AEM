function statusLabel(t, status) {
  switch (status) {
    case 'scheduled':
      return t('adminPage.broadcast.statusScheduled')
    case 'sent':
      return t('adminPage.broadcast.statusSent')
    case 'draft':
      return t('adminPage.broadcast.statusDraft')
    case 'failed':
      return t('adminPage.broadcast.statusFailed')
    default:
      return status
  }
}

export default function MessageHistory({ t, broadcasts, selectedId, onSelect, isLoading }) {
  if (isLoading) {
    return (
      <div className="admin-broadcast__history">
        <h3 className="admin-broadcast__subheading">{t('adminPage.broadcast.historyTitle')}</h3>
        <p className="admin-broadcast__muted">{t('adminPage.loadingDescription')}</p>
      </div>
    )
  }

  if (!broadcasts.length) {
    return (
      <div className="admin-broadcast__history">
        <h3 className="admin-broadcast__subheading">{t('adminPage.broadcast.historyTitle')}</h3>
        <p className="admin-broadcast__muted">{t('adminPage.broadcast.historyEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="admin-broadcast__history">
      <h3 className="admin-broadcast__subheading">{t('adminPage.broadcast.historyTitle')}</h3>
      <ul className="admin-broadcast__history-list" role="list">
        {broadcasts.map((row) => {
          const isSelected = String(row.id) === String(selectedId)
          return (
            <li key={row.id}>
              <button
                type="button"
                className={
                  isSelected
                    ? 'admin-broadcast__history-item admin-broadcast__history-item--selected'
                    : 'admin-broadcast__history-item'
                }
                onClick={() => onSelect(row.id)}
              >
                <span className="admin-broadcast__history-subject">{row.subject}</span>
                <span className="admin-broadcast__history-meta">
                  <span className={`admin-broadcast__pill admin-broadcast__pill--${row.status}`}>
                    {statusLabel(t, row.status)}
                  </span>
                  <span className="admin-broadcast__history-filter">{row.recipientFilter}</span>
                  {row.sentAt ? (
                    <time dateTime={row.sentAt}>
                      {new Date(row.sentAt).toLocaleString()}
                    </time>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
