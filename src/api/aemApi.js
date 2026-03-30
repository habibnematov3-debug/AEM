import { createClient } from '@supabase/supabase-js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const SUPABASE_STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'profile-images'
const CURRENT_USER_STORAGE_KEY = 'aem-current-user'
const DEFAULT_EVENT_IMAGE = '/event-images/default-event.svg'
const API_TIMEOUT_MS = 20000
let supabaseClient = null

function sanitizeImageUrl(value) {
  if (!value || typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase().startsWith('data:image/')) {
    return ''
  }

  return normalized
}

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

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return supabaseClient
}

export function isSupabaseUploadConfigured() {
  return Boolean(getSupabaseClient())
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
    settings: {
      theme: rawUser.settings?.theme ?? 'light',
      languageCode: rawUser.settings?.language_code ?? 'en',
      notificationsEnabled: rawUser.settings?.notifications_enabled ?? true,
      profileImageUrl: sanitizeImageUrl(rawUser.settings?.profile_image_url),
    },
    profileImageUrl: sanitizeImageUrl(rawUser.settings?.profile_image_url),
    createdEventsCount: rawUser.created_events_count ?? 0,
    joinedEventsCount: rawUser.joined_events_count ?? 0,
  }
}

function normalizeEvent(rawEvent) {
  const creatorId = rawEvent.creator_id != null ? String(rawEvent.creator_id) : ''
  const sanitizedCustomImageUrl = sanitizeImageUrl(rawEvent.image_url)
  const imageUrl = sanitizedCustomImageUrl || DEFAULT_EVENT_IMAGE

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
    customImageUrl: sanitizedCustomImageUrl,
    category: rawEvent.category ?? 'general',
    status: formatStatusLabel(rawEvent.moderation_status),
    moderationStatus: rawEvent.moderation_status ?? 'pending',
    isJoined: rawEvent.is_joined ?? false,
    creatorId,
    creatorName: rawEvent.creator_name ?? 'Unknown organizer',
    organizerId: creatorId,
    organizerName: rawEvent.creator_name ?? 'Unknown organizer',
    createdAt: rawEvent.created_at ?? null,
    updatedAt: rawEvent.updated_at ?? null,
  }
}

async function apiRequest(path, options = {}) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
      ...options,
    })
  } catch (error) {
    window.clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      const timeoutError = new Error(
        'The server is taking too long to respond. The backend may be waking up on Render or temporarily unavailable.',
      )
      timeoutError.status = 408
      throw timeoutError
    }

    if (error instanceof TypeError) {
      const networkError = new Error(
        'Could not reach the backend server. Please try again in a moment.',
      )
      networkError.status = 503
      throw networkError
    }

    throw error
  }

  window.clearTimeout(timeoutId)

  const text = await response.text()
  let payload = {}

  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = {}
  }

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

export async function fetchCurrentUser() {
  const payload = await apiRequest('/api/auth/me/')
  const user = normalizeUser(payload.user)
  storeCurrentUser(user)
  return user
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

export async function updateCurrentUserProfile(profileData) {
  const payload = await apiRequest('/api/auth/me/', {
    method: 'PATCH',
    body: JSON.stringify({
      full_name: profileData.fullName,
      theme: profileData.theme,
      language_code: profileData.languageCode,
      notifications_enabled: profileData.notificationsEnabled,
      profile_image_url: sanitizeImageUrl(profileData.profileImageUrl),
    }),
  })

  const user = normalizeUser(payload.user)
  storeCurrentUser(user)
  return {
    user,
    message: payload.message,
  }
}

export async function uploadProfileImageToSupabase(file, userId) {
  return uploadImageToSupabase(file, {
    folder: 'profile-images',
    ownerId: userId,
  })
}

export async function uploadEventImageToSupabase(file, userId) {
  return uploadImageToSupabase(file, {
    folder: 'event-images',
    ownerId: userId,
  })
}

async function uploadImageToSupabase(file, { folder, ownerId }) {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase upload is not configured yet.')
  }

  if (!(file instanceof File)) {
    throw new Error('Please choose an image file.')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported.')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Please upload an image smaller than 5 MB.')
  }

  const safeUserId = ownerId ? String(ownerId) : 'guest'
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : 'jpg'
  const safeFolder = folder ?? 'uploads'
  const filePath = `${safeFolder}/${safeUserId}/${Date.now()}-${crypto.randomUUID()}.${extension || 'jpg'}`

  const { error: uploadError } = await client.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    throw new Error(uploadError.message || 'Could not upload the image to Supabase.')
  }

  const { data } = client.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(filePath)
  const publicUrl = sanitizeImageUrl(data?.publicUrl)
  if (!publicUrl) {
    throw new Error('Supabase did not return a valid public image URL.')
  }

  return publicUrl
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
      image_url: sanitizeImageUrl(formData.imageUrl),
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
      image_url: sanitizeImageUrl(formData.imageUrl),
      category: formData.category || 'general',
    }),
  })

  return normalizeEvent(payload.event)
}

export async function deleteEvent(eventId) {
  const payload = await apiRequest(`/api/events/${eventId}/`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  })

  return {
    deletedEventId: String(payload.deleted_event_id),
    message: payload.message,
  }
}

export async function participateInEvent(eventId) {
  const payload = await apiRequest(`/api/events/${eventId}/participate/`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  return {
    message: payload.message,
    event: normalizeEvent(payload.event),
    participation: payload.participation ?? null,
  }
}
