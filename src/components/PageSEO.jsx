import { Helmet } from 'react-helmet-async'
import { useI18n } from '../i18n/LanguageContext'

const SITE_URL = 'https://www.eventajou.uz'
const SITE_NAME = 'AEM - Ajou Event Manager'
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`

function PageSEO({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  structuredData = null,
}) {
  const { languageCode } = useI18n()
  const fullUrl = `${SITE_URL}${path}`
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME

  return (
    <Helmet>
      <html lang={languageCode} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />

      {/* hreflang for multi-language */}
      <link rel="alternate" hreflang="en" href={`${fullUrl}?lang=en`} />
      <link rel="alternate" hreflang="uz" href={`${fullUrl}?lang=uz`} />
      <link rel="alternate" hreflang="ru" href={`${fullUrl}?lang=ru`} />
      <link rel="alternate" hreflang="x-default" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={languageCode === 'uz' ? 'uz_UZ' : languageCode === 'ru' ? 'ru_RU' : 'en_US'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      {structuredData ? (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      ) : null}
    </Helmet>
  )
}

export function EventStructuredData({ event }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.eventDate
      ? `${event.eventDate}T${event.startTime || '00:00'}`
      : undefined,
    endDate: event.eventDate
      ? `${event.eventDate}T${event.endTime || '23:59'}`
      : undefined,
    location: {
      '@type': 'Place',
      name: event.location || 'Ajou University',
    },
    organizer: {
      '@type': 'Organization',
      name: event.creatorName || event.organizerName || 'AEM',
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: event.image || DEFAULT_IMAGE,
    url: `${SITE_URL}/events/${event.id}`,
  }

  return <PageSEO structuredData={data} />
}

export default PageSEO
