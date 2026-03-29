const users = {
  student: {
    id: 'student-1',
    name: 'Amina Yusuf',
    email: 'amina@ajou.uz',
    password: 'student123',
    role: 'Student',
    department: 'Computer Science',
  },
  organizer: {
    id: 'organizer-1',
    name: 'Tech Events Club',
    email: 'organizer@ajou.uz',
    password: 'organizer123',
    role: 'Organizer',
    department: 'Campus Activities',
  },
}

const USERS_STORAGE_KEY = 'aem-mock-users'
const SESSION_STORAGE_KEY = 'aem-mock-session'
const EVENTS_STORAGE_KEY = 'aem-mock-events'
const DEFAULT_EVENT_IMAGE = '/event-images/default-event.svg'

const defaultEvents = []
const LEGACY_SEEDED_EVENT_IDS = new Set([
  'event-1',
  'event-2',
  'event-3',
  'event-4',
  'event-5',
  'event-6',
])

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    department: user.department,
  }
}

function getDefaultMockUsers() {
  return [normalizeUser(users.student), normalizeUser(users.organizer)]
}

export function getDefaultCurrentMockUser() {
  return normalizeUser(users.student)
}

export function getMockUsers() {
  if (!canUseStorage()) {
    return getDefaultMockUsers()
  }

  const storedUsers = window.localStorage.getItem(USERS_STORAGE_KEY)
  if (!storedUsers) {
    const initialUsers = getDefaultMockUsers()
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers))
    return initialUsers
  }

  return JSON.parse(storedUsers)
}

export function getMockUserById(userId) {
  return getMockUsers().find((user) => user.id === userId) ?? null
}

function saveMockUsers(nextUsers) {
  if (canUseStorage()) {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers))
  }
}

function removeLegacySeededEvents(events) {
  return events.filter((event) => !LEGACY_SEEDED_EVENT_IDS.has(event.id))
}

export function getMockEvents() {
  if (!canUseStorage()) {
    return defaultEvents
  }

  const storedEvents = window.localStorage.getItem(EVENTS_STORAGE_KEY)
  if (!storedEvents) {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(defaultEvents))
    return defaultEvents
  }

  const parsedEvents = JSON.parse(storedEvents)
  const sanitizedEvents = removeLegacySeededEvents(parsedEvents)

  if (sanitizedEvents.length !== parsedEvents.length) {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(sanitizedEvents))
  }

  return sanitizedEvents
}

function saveMockEvents(nextEvents) {
  if (canUseStorage()) {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(nextEvents))
  }
}

function getTrimmedValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveEventImage({ eventData, fallbackImage = '' }) {
  const uploadedImage = getTrimmedValue(eventData.uploadedImage)
  const imageUrl = getTrimmedValue(eventData.imageUrl)
  const existingImage = getTrimmedValue(eventData.existingImage)

  if (uploadedImage) {
    return uploadedImage
  }

  if (imageUrl) {
    return imageUrl
  }

  if (existingImage) {
    return existingImage
  }

  if (fallbackImage) {
    return fallbackImage
  }

  return DEFAULT_EVENT_IMAGE
}

export function getCurrentMockUser() {
  if (!canUseStorage()) {
    return normalizeUser(users.student)
  }

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY)
  return rawSession ? JSON.parse(rawSession) : null
}

function setCurrentMockUser(user) {
  if (canUseStorage()) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
  }
}

export function signInMockUser({ email, password }) {
  const existingUser = getMockUsers().find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password,
  )

  if (!existingUser) {
    return {
      ok: false,
      message: 'Mock account not found. Try amina@ajou.uz with password student123.',
    }
  }

  setCurrentMockUser(existingUser)
  return { ok: true, user: existingUser }
}

export function signUpMockUser({ fullName, email, password }) {
  const existingUsers = getMockUsers()
  const normalizedEmail = email.trim().toLowerCase()

  if (existingUsers.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    return {
      ok: false,
      message: 'This email is already used in the mock database.',
    }
  }

  const newUser = {
    id: `student-${Date.now()}`,
    name: fullName.trim(),
    email: normalizedEmail,
    password,
    role: 'Student',
    department: 'New Student',
  }

  saveMockUsers([...existingUsers, newUser])
  return { ok: true, user: newUser }
}

export function createMockEvent({ eventData, currentUser }) {
  const imageUrl = getTrimmedValue(eventData.imageUrl)
  const nextEvent = {
    id: `event-${Date.now()}`,
    title: eventData.title.trim(),
    description: eventData.description.trim(),
    date: new Date(`${eventData.date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    startTime: eventData.startTime,
    endTime: eventData.endTime,
    time: eventData.startTime,
    venue: eventData.location.trim(),
    city: 'Tashkent',
    location: eventData.location.trim(),
    image: resolveEventImage({ eventData }),
    customImageUrl: eventData.uploadedImage ? '' : imageUrl,
    category: eventData.category.trim() || 'General',
    priceLabel: 'Free',
    capacity: 0,
    registeredCount: 0,
    status: 'published',
    creatorName: currentUser.name,
    organizerName: currentUser.name,
    creatorId: currentUser.id,
    organizerId: currentUser.id,
    createdAt: new Date().toISOString(),
  }

  const nextEvents = [nextEvent, ...getMockEvents()]
  saveMockEvents(nextEvents)
  return nextEvent
}

export function updateMockEvent({ eventId, eventData }) {
  const currentEvents = getMockEvents()
  const existingEvent = currentEvents.find((event) => event.id === eventId)

  if (!existingEvent) {
    return null
  }

  const imageUrl = getTrimmedValue(eventData.imageUrl)
  const updatedEvent = {
    ...existingEvent,
    title: eventData.title.trim(),
    description: eventData.description.trim(),
    date: new Date(`${eventData.date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    startTime: eventData.startTime,
    endTime: eventData.endTime,
    time: eventData.startTime,
    venue: eventData.location.trim(),
    location: eventData.location.trim(),
    image: resolveEventImage({ eventData, fallbackImage: existingEvent.image }),
    customImageUrl: eventData.uploadedImage
      ? ''
      : imageUrl || existingEvent.customImageUrl || '',
    category: eventData.category.trim() || 'General',
    updatedAt: new Date().toISOString(),
  }

  const nextEvents = currentEvents.map((event) => (event.id === eventId ? updatedEvent : event))
  saveMockEvents(nextEvents)
  return updatedEvent
}

export function deleteMockEvent(eventId) {
  const currentEvents = getMockEvents()
  const nextEvents = currentEvents.filter((event) => event.id !== eventId)

  if (nextEvents.length === currentEvents.length) {
    return false
  }

  saveMockEvents(nextEvents)
  return true
}
