export default function MessageAnalytics({ t, detail, analytics, isLoading, errorMessage }) {
  if (!detail?.id) {
    return (
      <div className="admin-broadcast__analytics">
        <h3 className="admin-broadcast__subheading">{t('adminPage.broadcast.analyticsTitle')}</h3>
        <p className="admin-broadcast__muted">{t('adminPage.broadcast.selectBroadcast')}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="admin-broadcast__analytics">
        <h3 className="admin-broadcast__subheading">{t('adminPage.broadcast.analyticsTitle')}</h3>
        <p className="admin-broadcast__muted">{t('adminPage.loadingDescription')}</p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="admin-broadcast__analytics">
        <h3 className="admin-broadcast__subheading">{t('adminPage.broadcast.analyticsTitle')}</h3>
        <p className="admin-broadcast__error" role="alert">{errorMessage}</p>
      </div>
    )
  }

  const readRate =
    analytics.deliveries > 0 ? Math.round((analytics.readReceipts / analytics.deliveries) * 100) : 0

  return (
    <div className="admin-broadcast__analytics">
      <h3 className="admin-broadcast__subheading">{t('adminPage.broadcast.analyticsTitle')}</h3>
      <p className="admin-broadcast__analytics-subject">{detail.subject}</p>
      <dl className="admin-broadcast__stats">
        <div>
          <dt>{t('adminPage.broadcast.analyticsDeliveries')}</dt>
          <dd>{analytics.deliveries}</dd>
        </div>
        <div>
          <dt>{t('adminPage.broadcast.analyticsEmails')}</dt>
          <dd>{analytics.emailsSent}</dd>
        </div>
        <div>
          <dt>{t('adminPage.broadcast.analyticsReads')}</dt>
          <dd>{analytics.readReceipts}</dd>
        </div>
        <div>
          <dt>{t('adminPage.broadcast.readRate')}</dt>
          <dd>{readRate}%</dd>
        </div>
      </dl>
      <p className="admin-broadcast__hint">{t('adminPage.broadcast.analyticsHint')}</p>
    </div>
  )
}
