const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const CURRENT_USER_STORAGE_KEY = 'aem-current-user'
const DEFAULT_EVENT_IMAGE = '/event-images/default-event.svg'

function formatEventDate(value) {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatStatusLabel(value) {
  if (!value) {
    return 'Pending'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function storeCurrentUser(user) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user))
}

function clearCurrentUser() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
}

function normalizeUser(rawUser) {
  if (!rawUser) {
    return null
  }

  return {
    id: String(rawUser.id),
    name: rawUser.full_name ?? rawUser.name ?? '',
    email: rawUser.email ?? '',
    role: rawUser.role ?? 'student',
    isActive: rawUser.is_active ?? true,
    createdAt: rawUser.created_at ?? null,
  }
}

function normalizeEvent(rawEvent) {
  const creatorId = rawEvent.creator_id != null ? String(rawEvent.creator_id) : ''
  const imageUrl = rawEvent.image_url?.trim?.() ? rawEvent.image_url : DEFAULT_EVENT_IMAGE

  return {
    id: String(rawEvent.id),
    title: rawEvent.title ?? '',
    description: rawEvent.description ?? '',
    date: formatEventDate(rawEvent.event_date),
    startTime: rawEvent.start_time ?? '',
    endTime: rawEvent.end_time ?? '',
    time: rawEvent.start_time ?? '',
    venue: rawEvent.location ?? '',
    city: 'Tashkent',
    location: rawEvent.location ?? '',
    image: imageUrl,
    customImageUrl: rawEvent.image_url ?? '',
    category: rawEvent.category ?? 'general',
    status: formatStatusLabel(rawEvent.moderation_status),
    moderationStatus: rawEvent.moderation_status ?? 'pending',
    creatorId,
    creatorName: rawEvent.creator_name ?? 'Unknown organizer',
    organizerId: creatorId,
    organizerName: rawEvent.creator_name ?? 'Unknown organizer',
    createdAt: rawEvent.created_at ?? null,
    updatedAt: rawEvent.updated_at ?? null,
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const message =
      payload.detail ??
      payload.message ??
      (typeof payload === 'object' && payload !== null ? Object.values(payload).flat().join(' ') : '') ??
      'Request failed.'
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export function getStoredCurrentUser() {
  if (!canUseStorage()) {
    return null
  }

  const rawValue = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY)
  return rawValue ? JSON.parse(rawValue) : null
}

export async function signInUser(credentials) {
  const payload = await apiRequest('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  })

  const user = normalizeUser(payload.user)
  storeCurrentUser(user)
  return { ok: true, user, message: payload.message }
}

export async function signUpUser(formData) {
  const payload = await apiRequest('/api/auth/signup/', {
    method: 'POST',
    body: JSON.stringify({
      full_name: formData.fullName,
      email: formData.email,
      password: formData.password,
      role: 'student',
    }),
  })

  return {
    ok: true,
    user: normalizeUser(payload.user),
    message: payload.message,
  }
}

export async function logoutUser() {
  await apiRequest('/api/auth/logout/', { method: 'POST', body: JSON.stringify({}) })
  clearCurrentUser()
}

export async function fetchEvents() {
  const payload = await apiRequest('/api/events/')
  return (payload.results ?? []).map(normalizeEvent)
}

export async function fetchEventById(eventId) {
  const payload = await apiRequest(`/api/events/${eventId}/`)
  return normalizeEvent(payload)
}

export async function createEvent(formData) {
  const payload = await apiRequest('/api/events/', {
    method: 'POST',
    body: JSON.stringify({
      title: formData.title,
      description: formData.description,
      event_date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      location: formData.location,
      image_url: formData.uploadedImage || formData.imageUrl || '',
      category: formData.category || 'general',
    }),
  })

  return normalizeEvent(payload.event)
}

export async function updateEvent(eventId, formData) {
  const payload = await apiRequest(`/api/events/${eventId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: formData.title,
      description: formData.description,
      event_date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      location: formData.location,
      image_url: formData.uploadedImage || formData.imageUrl || '',
      category: formData.category || 'general',
    }),
  })

  return normalizeEvent(payload.event)
}
