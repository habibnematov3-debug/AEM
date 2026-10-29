import { streamText } from 'ai'

const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 4000
const MAX_TOTAL_MESSAGE_LENGTH = 16000
const EVENTS_LIMIT = 50

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function sendJson(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).setHeader('Content-Type', 'application/json').send(body)
}

function parseMessages(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== 'object' || !Array.isArray((body as any).messages)) {
    return null
  }

  const rawMessages = (body as any).messages
  if (rawMessages.length === 0 || rawMessages.length > MAX_MESSAGES) {
    return null
  }

  const messages: ChatMessage[] = []
  let totalLength = 0

  for (const message of rawMessages) {
    if (
      !message ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string'
    ) {
      return null
    }

    const content = message.content.trim()
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      return null
    }

    totalLength += content.length
    if (totalLength > MAX_TOTAL_MESSAGE_LENGTH) {
      return null
    }

    messages.push({ role: message.role, content })
  }

  if (messages.at(-1)?.role !== 'user') {
    return null
  }

  return messages
}

async function loadEvents(authorization: string) {
  const backendUrl = (
    process.env.AEM_BACKEND_URL ||
    process.env.VITE_API_BASE_URL ||
    'https://api.eventajou.uz'
  ).replace(/\/$/, '')

  const response = await fetch(`${backendUrl}/api/events/`, {
    headers: {
      Accept: 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Event service returned ${response.status}`)
  }

  const payload = await response.json()
  const events = Array.isArray(payload?.results) ? payload.results : []

  return events.slice(0, EVENTS_LIMIT).map((event: any) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    location: event.location,
    eventDate: event.event_date ?? event.eventDate,
    startTime: event.start_time ?? event.startTime,
    endTime: event.end_time ?? event.endTime,
    moderationStatus: event.moderation_status ?? event.moderationStatus,
    capacity: event.capacity,
    joinedCount: event.joined_count ?? event.joinedCount,
    waitlistCount: event.waitlist_count ?? event.waitlistCount,
  }))
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return sendJson(res, 503, { error: 'AI service is not configured.' })
  }

  const messages = parseMessages(req.body)
  if (!messages) {
    return sendJson(res, 400, {
      error: 'Send 1-20 messages with non-empty content up to 4000 characters each.',
    })
  }

  const authorization = typeof req.headers?.authorization === 'string'
    ? req.headers.authorization
    : ''

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return sendJson(res, 401, { error: 'Authentication required.' })
  }

  try {
    const events = await loadEvents(authorization)
    const result = streamText({
      model: 'google/gemini-3.1-flash-lite',
      system: [
        'You are EventAjou, a campus event assistant.',
        'Use only the event data supplied below.',
        'Never invent event names, dates, times, venues, links, capacity, or availability.',
        'If the supplied data does not answer the question, say that the available event data is insufficient.',
        'Recommend events only when the recommendation is supported by their category or description.',
        `Available EventAjou events (JSON): ${JSON.stringify(events)}`,
      ].join('\n'),
      messages,
      maxOutputTokens: 500,
    })

    return result.pipeTextStreamToResponse(res)
  } catch (error) {
    console.error('AI chat request failed:', error instanceof Error ? error.message : 'unknown error')
    return sendJson(res, 502, { error: 'The AI assistant is temporarily unavailable.' })
  }
}
