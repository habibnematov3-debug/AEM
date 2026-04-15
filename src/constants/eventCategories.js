export const EVENT_CATEGORIES = [
  { value: 'general', label: 'General', color: 'blue' },
  { value: 'academic', label: 'Academic', color: 'indigo' },
  { value: 'culture', label: 'Culture', color: 'teal' },
  { value: 'music', label: 'Music', color: 'pink' },
  { value: 'sports', label: 'Sports', color: 'orange' },
  { value: 'opening', label: 'Opening', color: 'green' },
  { value: 'workshop', label: 'Workshop', color: 'purple' },
  { value: 'networking', label: 'Networking', color: 'amber' },
]

export function getCategoryLabel(value) {
  const category = EVENT_CATEGORIES.find(cat => cat.value === value)
  return category ? category.label : value
}

export function getCategoryColor(value) {
  const category = EVENT_CATEGORIES.find(cat => cat.value === value)
  return category ? category.color : 'blue'
}

export function normalizeCategory(input) {
  if (!input || typeof input !== 'string') return 'general'
  
  const normalized = input.trim().toLowerCase()
  
  // Try exact match first
  const exactMatch = EVENT_CATEGORIES.find(cat => cat.value === normalized)
  if (exactMatch) return exactMatch.value
  
  // Try label match
  const labelMatch = EVENT_CATEGORIES.find(cat => 
    cat.label.toLowerCase() === normalized
  )
  if (labelMatch) return labelMatch.value
  
  // Try partial match
  const partialMatch = EVENT_CATEGORIES.find(cat => 
    cat.label.toLowerCase().includes(normalized) || 
    normalized.includes(cat.label.toLowerCase())
  )
  if (partialMatch) return partialMatch.value
  
  // Return default if no match
  return 'general'
}
