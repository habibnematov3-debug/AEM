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

const defaultEvents = [
  {
    id: 'event-1',
    title: 'Annual Tech Conference 2026',
    category: 'Workshop',
    description:
      'Hands-on session for students who want to turn class projects into product demos.',
    date: 'April 15, 2026',
    startTime: '18:30',
    endTime: '20:30',
    time: '18:30',
    venue: 'Main Auditorium',
    city: 'Tashkent',
    location: 'Main Auditorium',
    image: '/event-images/tech-conference.svg',
    priceLabel: 'Free',
    capacity: 80,
    registeredCount: 54,
    status: 'Open',
    organizerName: 'Tech Events Club',
    creatorId: 'organizer-1',
    organizerId: 'organizer-1',
    createdAt: '2026-03-20T09:00:00.000Z',
  },
  {
    id: 'event-2',
    title: 'Spring Music Festival',
    category: 'Competition',
    description:
      'Pitch your idea to mentors and get structured feedback before the semester demo.',
    date: 'April 22, 2026',
    startTime: '17:00',
    endTime: '21:00',
    time: '17:00',
    venue: 'University Stadium',
    city: 'Tashkent',
    location: 'University Stadium',
    image: '/event-images/music-festival.svg',
    priceLabel: '$5',
    capacity: 120,
    registeredCount: 91,
    status: 'Open',
    organizerName: 'Tech Events Club',
    creatorId: 'organizer-1',
    organizerId: 'organizer-1',
    createdAt: '2026-03-21T10:30:00.000Z',
  },
  {
    id: 'event-3',
    title: 'AI & Machine Learning Workshop',
    category: 'Networking',
    description:
      'Informal networking evening with alumni, recruiters, and final-year students.',
    date: 'April 18, 2026',
    startTime: '19:15',
    endTime: '21:15',
    time: '19:15',
    venue: 'Computer Science Building',
    city: 'Tashkent',
    location: 'Computer Science Building',
    image: '/event-images/ai-workshop.svg',
    priceLabel: '$3',
    capacity: 60,
    registeredCount: 60,
    status: 'Full',
    organizerName: 'Tech Events Club',
    creatorId: 'organizer-1',
    organizerId: 'organizer-1',
    createdAt: '2026-03-22T12:00:00.000Z',
  },
  {
    id: 'event-4',
    title: 'Design Thinking Bootcamp',
    category: 'Workshop',
    description:
      'Fast collaborative ideation session for product design, UX thinking, and student startups.',
    date: 'May 02, 2026',
    startTime: '14:00',
    endTime: '17:00',
    time: '14:00',
    venue: 'Creative Studio',
    city: 'Tashkent',
    location: 'Creative Studio',
    image: '/event-images/design-bootcamp.svg',
    priceLabel: 'Free',
    capacity: 50,
    registeredCount: 27,
    status: 'Open',
    organizerName: 'Tech Events Club',
    creatorId: 'organizer-1',
    organizerId: 'organizer-1',
    createdAt: '2026-03-23T08:45:00.000Z',
  },
  {
    id: 'event-5',
    title: 'Robotics Challenge Finals',
    category: 'Competition',
    description:
      'Final presentations and live demonstrations from interdisciplinary robotics teams.',
    date: 'May 07, 2026',
    startTime: '16:30',
    endTime: '19:30',
    time: '16:30',
    venue: 'Engineering Arena',
    city: 'Tashkent',
    location: 'Engineering Arena',
    image: '/event-images/robotics-finals.svg',
    priceLabel: '$2',
    capacity: 140,
    registeredCount: 96,
    status: 'Open',
    organizerName: 'Tech Events Club',
    creatorId: 'organizer-1',
    organizerId: 'organizer-1',
    createdAt: '2026-03-24T14:10:00.000Z',
  },
  {
    id: 'event-6',
    title: 'Cinema Under the Stars',
    category: 'Community',
    description:
      'Relaxed outdoor movie night with snacks, music, and student community activities.',
    date: 'May 12, 2026',
    startTime: '20:00',
    endTime: '22:00',
    time: '20:00',
    venue: 'Campus Courtyard',
    city: 'Tashkent',
    location: 'Campus Courtyard',
    image: '/event-images/cinema-night.svg',
    priceLabel: 'Free',
    capacity: 100,
    registeredCount: 61,
    status: 'Open',
    organizerName: 'Tech Events Club',
    creatorId: 'organizer-1',
    organizerId: 'organizer-1',
    createdAt: '2026-03-25T16:20:00.000Z',
  },
]

const organizerEvents = defaultEvents.filter((event) => event.creatorId === users.organizer.id)
const totalCapacity = organizerEvents.reduce((sum, event) => sum + event.capacity, 0)
const totalRegistered = organizerEvents.reduce((sum, event) => sum + event.registeredCount, 0)

export const authOptions = [
  {
    id: 'student',
    title: 'Student flow',
    description: 'Browse events, inspect details, and see what is currently open.',
    path: '/students',
  },
  {
    id: 'organizer',
    title: 'Organizer flow',
    description: 'Review your event lineup, registrations, and event status at a glance.',
    path: '/organizer',
  },
]

export const studentPageData = {
  user: users.student,
  welcomeNote:
    'This page behaves like the future attendee dashboard, but for now it reads from local mock data only.',
  events: defaultEvents,
}

export const organizerPageData = {
  user: users.organizer,
  stats: [
    { label: 'Events', value: organizerEvents.length },
    { label: 'Registrations', value: totalRegistered },
    { label: 'Open spots', value: totalCapacity - totalRegistered },
  ],
  events: organizerEvents,
}

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

export function getMockEvents() {
  if (!canUseStorage()) {
    return defaultEvents
  }

  const storedEvents = window.localStorage.getItem(EVENTS_STORAGE_KEY)
  if (!storedEvents) {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(defaultEvents))
    return defaultEvents
  }

  return JSON.parse(storedEvents)
}

function saveMockEvents(nextEvents) {
  if (canUseStorage()) {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(nextEvents))
  }
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
    image: eventData.imageUrl.trim() || '/event-images/default-event.svg',
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
    image: eventData.imageUrl.trim() || '/event-images/default-event.svg',
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
