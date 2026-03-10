export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

export const MOCK_API_STORAGE_KEY = 'useMockApi'

export function isMockApiEnabled() {
  if (typeof window === 'undefined') {
    return USE_MOCK_API
  }

  const storedValue = window.localStorage.getItem(MOCK_API_STORAGE_KEY)
  if (storedValue === 'true') return true
  if (storedValue === 'false') return false

  return USE_MOCK_API
}

export function setMockApiEnabled(enabled) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MOCK_API_STORAGE_KEY, String(Boolean(enabled)))
}

export function clearMockApiSetting() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(MOCK_API_STORAGE_KEY)
}

export function delay(value, error = null, ms = 120) {
  if (error) {
    return new Promise((_, reject) => setTimeout(() => reject({ error }), ms))
  }
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms))
}

export function paginate(items, page = 1, pageSize = 20) {
  const safePage = Number(page) || 1
  const safePageSize = Number(pageSize) || 20
  const start = (safePage - 1) * safePageSize
  const data = items.slice(start, start + safePageSize)

  return {
    data,
    meta: {
      total: items.length,
      page: safePage,
      totalPages: Math.max(1, Math.ceil(items.length / safePageSize)),
      pageSize: safePageSize,
    },
    pagination: {
      total: items.length,
      page: safePage,
      totalPages: Math.max(1, Math.ceil(items.length / safePageSize)),
      pageSize: safePageSize,
    },
  }
}

export function includesText(value, keyword) {
  if (!keyword) return true
  return String(value || '').toLowerCase().includes(String(keyword).toLowerCase())
}

export function byKeyword(record, keyword, fields = []) {
  if (!keyword) return true
  return fields.some((field) => includesText(record?.[field], keyword))
}

export function makeId(prefix, counter) {
  return `${prefix}-${String(counter).padStart(3, '0')}`
}
