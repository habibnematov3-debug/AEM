import { createClient } from '@supabase/supabase-js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const SUPABASE_STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'profile-images'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const CURRENT_USER_STORAGE_KEY = 'aem-current-user'
const AUTH_TOKEN_STORAGE_KEY = 'aem-auth-token'
const DEFAULT_EVENT_IMAGE = '/event-images/default-event.svg'
const API_TIMEOUT_MS = 35000
const AUTH_API_TIMEOUT_MS = 65000
const SAFE_REQUEST_RETRIES = 1
const SAFE_REQUEST_RETRY_DELAY_MS = 1800
let supabaseClient = null

function normalizeRole(value) {
  return value === 'admin' ? 'admin' : 'student'
}

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

export function getGoogleClientId() {
  return GOOGLE_CLIENT_ID.trim()
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

function getStoredAuthToken() {
  if (!canUseStorage()) {
    return ''
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

function storeAuthToken(token) {
  if (!canUseStorage() || !token) {
    return
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

function clearAuthToken() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}

function normalizeUser(rawUser) {
  if (!rawUser) {
    return null
  }

  return {
    id: String(rawUser.id),
    name: rawUser.full_name ?? rawUser.name ?? '',
    email: rawUser.email ?? '',
    role: normalizeRole(rawUser.role),
    isOwner: rawUser.is_owner ?? false,
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
    eventDate: rawEvent.event_date ?? '',
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
    capacity: rawEvent.capacity ?? null,
    joinedCount: Number(rawEvent.joined_count ?? 0),
    waitlistCount: Number(rawEvent.waitlist_count ?? 0),
    checkedInCount: Number(rawEvent.checked_in_count ?? 0),
    noShowCount: Number(rawEvent.no_show_count ?? 0),
    spotsRemaining: rawEvent.spots_remaining ?? null,
    isJoined: rawEvent.is_joined ?? false,
    isWaitlisted: rawEvent.is_waitlisted ?? false,
    waitlistPosition: rawEvent.waitlist_position ?? null,
    isLiked: rawEvent.is_liked ?? false,
    likesCount: rawEvent.likes_count ?? 0,
    creatorId,
    creatorName: rawEvent.creator_name ?? 'Unknown organizer',
    organizerId: creatorId,
    organizerName: rawEvent.creator_name ?? 'Unknown organizer',
    createdAt: rawEvent.created_at ?? null,
    updatedAt: rawEvent.updated_at ?? null,
  }
}

function normalizeAdminStats(rawStats = {}) {
  return {
    users: rawStats.users ?? 0,
    events: rawStats.events ?? 0,
    pending: rawStats.pending ?? 0,
    approved: rawStats.approved ?? 0,
    rejected: rawStats.rejected ?? 0,
    upcoming: rawStats.upcoming ?? 0,
    inProgress: rawStats.in_progress ?? 0,
    finished: rawStats.finished ?? 0,
    waitlisted: rawStats.waitlisted ?? 0,
    attended: rawStats.attended ?? 0,
    noShows: rawStats.no_shows ?? 0,
  }
}

function normalizeAdminUser(rawUser) {
  return {
    id: String(rawUser.id),
    name: rawUser.full_name ?? '',
    email: rawUser.email ?? '',
    role: normalizeRole(rawUser.role),
    isOwner: rawUser.is_owner ?? false,
    isActive: rawUser.is_active ?? true,
    isOnline: rawUser.is_online ?? false,
    lastSeenAt: rawUser.last_seen_at ?? null,
    createdAt: rawUser.created_at ?? null,
    createdEventsCount: rawUser.created_events_count ?? 0,
    joinedEventsCount: rawUser.joined_events_count ?? 0,
    profileImageUrl: sanitizeImageUrl(rawUser.profile_image_url),
  }
}

function normalizeParticipationActivity(rawParticipation) {
  return {
    id: String(rawParticipation.id),
    userId: rawParticipation.user_id != null ? String(rawParticipation.user_id) : '',
    eventId: rawParticipation.event_id != null ? String(rawParticipation.event_id) : '',
    userName: rawParticipation.user_name ?? '',
    eventTitle: rawParticipation.event_title ?? '',
    status: rawParticipation.status ?? 'joined',
    joinedAt: rawParticipation.joined_at ?? null,
  }
}

function normalizeJoinedParticipation(rawParticipation) {
  return {
    id: String(rawParticipation.id),
    status: rawParticipation.status ?? 'joined',
    joinedAt: rawParticipation.joined_at ?? null,
    checkedInAt: rawParticipation.checked_in_at ?? null,
    event: normalizeEvent(rawParticipation.event ?? {}),
  }
}

function normalizeEventParticipant(rawParticipant) {
  return {
    id: String(rawParticipant.id),
    userId: rawParticipant.user_id != null ? String(rawParticipant.user_id) : '',
    userName: rawParticipant.user_name ?? '',
    email: rawParticipant.email ?? '',
    status: rawParticipant.status ?? 'joined',
    joinedAt: rawParticipant.joined_at ?? null,
    checkedInAt: rawParticipant.checked_in_at ?? null,
    profileImageUrl: sanitizeImageUrl(rawParticipant.profile_image_url),
  }
}

function normalizeParticipationRecord(rawParticipation) {
  return {
    id: rawParticipation.id != null ? String(rawParticipation.id) : '',
    userId: rawParticipation.user_id != null ? String(rawParticipation.user_id) : '',
    eventId: rawParticipation.event_id != null ? String(rawParticipation.event_id) : '',
    userName: rawParticipation.user_name ?? '',
    email: rawParticipation.email ?? '',
    status: rawParticipation.status ?? 'joined',
    joinedAt: rawParticipation.joined_at ?? null,
    checkedInAt: rawParticipation.checked_in_at ?? null,
    profileImageUrl: sanitizeImageUrl(rawParticipation.profile_image_url),
  }
}

function normalizeNotification(rawNotification) {
  return {
    id: rawNotification.id != null ? String(rawNotification.id) : '',
    eventId: rawNotification.event_id != null ? String(rawNotification.event_id) : '',
    type: rawNotification.notification_type ?? '',
    title: rawNotification.title ?? '',
    message: rawNotification.message ?? '',
    linkUrl: rawNotification.link_url ?? '',
    readAt: rawNotification.read_at ?? null,
    createdAt: rawNotification.created_at ?? null,
  }
}

export function extractCheckInToken(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    return ''
  }

  const lowerCasedValue = normalized.toLowerCase()
  if (lowerCasedValue.startsWith('http://') || lowerCasedValue.startsWith('https://')) {
    try {
      const parsedUrl = new URL(normalized)
      return parsedUrl.searchParams.get('token')?.trim() ?? ''
    } catch {
      return ''
    }
  }

  return normalized
}

export function buildCheckInResultPath(eventId, token) {
  const safeToken = encodeURIComponent(token)
  return `/events/${eventId}/check-in/result?token=${safeToken}`
}

export function buildAbsoluteCheckInResultUrl(eventId, token) {
  const path = buildCheckInResultPath(eventId, token)
  if (typeof window === 'undefined') {
    return path
  }

  return new URL(path, window.location.origin).toString()
}

export function getDefaultRouteForRole(role) {
  if (role === 'admin') {
    return '/admin'
  }

  return '/students'
}

export async function warmUpBackend() {
  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${API_BASE_URL}/api/health/`, {
      method: 'GET',
      signal: controller.signal,
    })

    window.clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

async function apiRequest(path, options = {}) {
  const { timeoutMs = API_TIMEOUT_MS, ...requestOptions } = options
  const method = String(options.method ?? 'GET').toUpperCase()
  const canRetry = method === 'GET' || method === 'HEAD'
  const maxAttempts = canRetry ? SAFE_REQUEST_RETRIES + 1 : 1
  const authToken = getStoredAuthToken()
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers ?? {}),
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    let response

    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...requestOptions,
        credentials: 'include',
        headers: requestHeaders,
        signal: controller.signal,
      })
    } catch (error) {
      window.clearTimeout(timeoutId)

      if (canRetry && attempt < maxAttempts && (error.name === 'AbortError' || error instanceof TypeError)) {
        await new Promise((resolve) => window.setTimeout(resolve, SAFE_REQUEST_RETRY_DELAY_MS))
        continue
      }

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
      const defaultErrorMessage =
        response.status === 401
          ? 'Your sign-in has expired. Please sign in again.'
          : 'Request failed.'
      const message =
        payload.detail ??
        payload.message ??
        (typeof payload === 'object' && payload !== null ? Object.values(payload).flat().join(' ') : '') ??
        defaultErrorMessage
      const error = new Error(message)
      error.status = response.status
      error.payload = payload

      if (response.status === 401 && typeof window !== 'undefined') {
        clearAuthToken()
        clearCurrentUser()
        window.dispatchEvent(new CustomEvent('aem:unauthorized'))
      }

      if (canRetry && attempt < maxAttempts && response.status >= 500) {
        await new Promise((resolve) => window.setTimeout(resolve, SAFE_REQUEST_RETRY_DELAY_MS))
        continue
      }

      throw error
    }

    return payload
  }

  throw new Error('Request failed.')
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
    timeoutMs: AUTH_API_TIMEOUT_MS,
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  })

  storeAuthToken(payload.auth_token)
  const user = normalizeUser(payload.user)
  storeCurrentUser(user)
  return { ok: true, user, message: payload.message }
}

export async function signInWithGoogleCredential(credential) {
  const payload = await apiRequest('/api/auth/google/', {
    method: 'POST',
    timeoutMs: AUTH_API_TIMEOUT_MS,
    body: JSON.stringify({
      credential,
    }),
  })

  storeAuthToken(payload.auth_token)
  const user = normalizeUser(payload.user)
  storeCurrentUser(user)
  return { ok: true, user, message: payload.message }
}

export async function fetchCurrentUser() {
  const payload = await apiRequest('/api/auth/me/', {
    timeoutMs: AUTH_API_TIMEOUT_MS,
  })
  const user = normalizeUser(payload.user)
  storeCurrentUser(user)
  return user
}

export async function signUpUser(formData) {
  const payload = await apiRequest('/api/auth/signup/', {
    method: 'POST',
    timeoutMs: AUTH_API_TIMEOUT_MS,
    body: JSON.stringify({
      full_name: formData.fullName,
      email: formData.email,
      password: formData.password,
    }),
  })

  storeAuthToken(payload.auth_token)
  const user = normalizeUser(payload.user)
  storeCurrentUser(user)
  return {
    ok: true,
    user,
    message: payload.message,
  }
}

export async function fetchAuthProviders() {
  const payload = await apiRequest('/api/auth/providers/', {
    timeoutMs: 10000,
  })

  return {
    google: {
      backendEnabled: Boolean(payload.google?.enabled),
    },
  }
}

export async function logoutUser() {
  try {
    await apiRequest('/api/auth/logout/', { method: 'POST', body: JSON.stringify({}) })
  } finally {
    clearAuthToken()
    clearCurrentUser()
  }
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

export async function fetchMyNotifications(limit = 20) {
  const payload = await apiRequest(`/api/notifications/?limit=${Math.max(1, Math.min(50, Number(limit) || 20))}`)
  return {
    notifications: (payload.results ?? []).map(normalizeNotification),
    unreadCount: payload.unread_count ?? 0,
  }
}

export async function markNotificationRead(notificationId) {
  const payload = await apiRequest(`/api/notifications/${notificationId}/read/`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  return {
    notification: normalizeNotification(payload.notification ?? {}),
    unreadCount: payload.unread_count ?? 0,
    message: payload.message ?? '',
  }
}

export async function markAllNotificationsRead() {
  const payload = await apiRequest('/api/notifications/read-all/', {
    method: 'POST',
    body: JSON.stringify({}),
  })

  return {
    unreadCount: payload.unread_count ?? 0,
    message: payload.message ?? '',
  }
}

export async function sendAdminReminderBatch({ hoursAhead = 24, force = false } = {}) {
  const payload = await apiRequest('/api/admin/reminders/send/', {
    method: 'POST',
    body: JSON.stringify({
      hours_ahead: hoursAhead,
      force,
    }),
  })

  return {
    sentCount: payload.sent_count ?? 0,
    message: payload.message ?? '',
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

export async function fetchRecommendedEvents() {
  const payload = await apiRequest('/api/events/recommended/')
  return (payload.results ?? []).map(normalizeEvent)
}

export async function fetchOrganizerEvents() {
  const payload = await apiRequest('/api/events/?scope=organizer')
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
      capacity: formData.capacity != null ? formData.capacity : null,
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
      capacity: formData.capacity != null ? formData.capacity : null,
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

export async function likeEvent(eventId) {
  const payload = await apiRequest(`/api/events/${eventId}/like/`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  return {
    message: payload.message,
    event: normalizeEvent(payload.event),
  }
}

export async function unlikeEvent(eventId) {
  const payload = await apiRequest(`/api/events/${eventId}/like/`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  })

  return {
    message: payload.message,
    event: normalizeEvent(payload.event),
  }
}

export async function cancelParticipation(eventId) {
  const payload = await apiRequest(`/api/events/${eventId}/cancel-participation/`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  return {
    message: payload.message,
    event: normalizeEvent(payload.event),
    participation: payload.participation ?? null,
  }
}

export async function checkInParticipant(eventId, participationId) {
  const payload = await apiRequest(
    `/api/events/${eventId}/participants/${participationId}/checkin/`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )

  return {
    message: payload.message,
    event: normalizeEvent(payload.event),
    participation: payload.participation ?? null,
  }
}

export async function fetchMyCheckInPass(eventId) {
  const payload = await apiRequest(`/api/events/${eventId}/my-checkin-token/`)

  return {
    token: payload.token ?? '',
    event: normalizeEvent(payload.event ?? {}),
    participation: normalizeParticipationRecord(payload.participation ?? {}),
  }
}

export async function checkInParticipantByToken(eventId, token) {
  const payload = await apiRequest(`/api/events/${eventId}/checkin-token/`, {
    method: 'POST',
    body: JSON.stringify({
      token: extractCheckInToken(token),
    }),
  })

  return {
    message: payload.message,
    event: normalizeEvent(payload.event ?? {}),
    participation: normalizeParticipationRecord(payload.participation ?? {}),
  }
}

export async function fetchMyParticipations() {
  const payload = await apiRequest('/api/participations/me/')
  return (payload.results ?? []).map(normalizeJoinedParticipation)
}

export async function fetchEventParticipants(eventId) {
  const payload = await apiRequest(`/api/events/${eventId}/participants/`)
  return {
    event: normalizeEvent(payload.event),
    totalParticipants: payload.total_participants ?? 0,
    participants: (payload.results ?? []).map(normalizeEventParticipant),
  }
}

export async function fetchAdminDashboard() {
  const payload = await apiRequest('/api/admin/dashboard/')
  return {
    stats: normalizeAdminStats(payload.stats),
    recentEvents: (payload.recent_events ?? []).map(normalizeEvent),
    recentUsers: (payload.recent_users ?? []).map(normalizeAdminUser),
    recentParticipations: (payload.recent_participations ?? []).map(normalizeParticipationActivity),
  }
}

export async function fetchAdminEvents({ status = '', query = '' } = {}) {
  const params = new URLSearchParams()
  if (status) {
    params.set('status', status)
  }
  if (query.trim()) {
    params.set('q', query.trim())
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const payload = await apiRequest(`/api/admin/events/${suffix}`)
  return (payload.results ?? []).map(normalizeEvent)
}

export async function moderateAdminEvent(eventId, moderationStatus) {
  const payload = await apiRequest(`/api/admin/events/${eventId}/moderate/`, {
    method: 'PATCH',
    body: JSON.stringify({
      moderation_status: moderationStatus,
    }),
  })

  return {
    message: payload.message,
    event: normalizeEvent(payload.event),
    stats: normalizeAdminStats(payload.stats),
  }
}

export async function deleteAdminEvent(eventId) {
  const payload = await apiRequest(`/api/admin/events/${eventId}/delete/`, {
    method: 'DELETE',
  })

  return {
    message: payload.message,
    stats: normalizeAdminStats(payload.stats),
  }
}

export async function deleteAdminEvents(eventIds) {
  const payload = await apiRequest('/api/admin/events/', {
    method: 'DELETE',
    body: JSON.stringify({ event_ids: eventIds }),
  })

  return {
    message: payload.message,
    stats: normalizeAdminStats(payload.stats),
  }
}

export async function fetchAdminUsers({ role = '', query = '', isActive = '' } = {}) {
  const params = new URLSearchParams()
  if (role) {
    params.set('role', role)
  }
  if (query.trim()) {
    params.set('q', query.trim())
  }
  if (isActive !== '') {
    params.set('is_active', String(isActive))
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const payload = await apiRequest(`/api/admin/users/${suffix}`)
  return (payload.results ?? []).map(normalizeAdminUser)
}

export async function updateAdminUser(userId, updates) {
  const payload = await apiRequest(`/api/admin/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })

  return {
    message: payload.message,
    user: normalizeAdminUser(payload.user),
  }
}
