/**
 * Mock Data Storage Service
 * Quản lý mock data với localStorage persistence.
 * 
 * - Data persist qua refresh
 * - Auto-seed data mặc định nếu chưa có
 * - Hỗ trợ CRUD operations
 * - TTL (time-to-live) tùy chọn: data tự clear sau N giờ
 */

const STORAGE_PREFIX = 'swm_mock_'
const MOCK_ENABLED_KEY = `${STORAGE_PREFIX}enabled`
const MOCK_SEEDED_KEY = `${STORAGE_PREFIX}seeded_at`
const DEFAULT_TTL_HOURS = 24 // Tự clear sau 24 giờ

// ============================================================
// Core Storage Utilities
// ============================================================

function getKey(collection) {
  return `${STORAGE_PREFIX}${collection}`
}

function readCollection(collection) {
  try {
    const raw = localStorage.getItem(getKey(collection))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCollection(collection, data) {
  try {
    localStorage.setItem(getKey(collection), JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

function removeCollection(collection) {
  localStorage.removeItem(getKey(collection))
}

// ============================================================
// Mock Data Toggle
// ============================================================

export function isMockEnabled() {
  return localStorage.getItem(MOCK_ENABLED_KEY) !== 'false'
}

export function setMockEnabled(enabled) {
  localStorage.setItem(MOCK_ENABLED_KEY, String(enabled))
}

// ============================================================
// TTL & Auto-Clear
// ============================================================

export function checkAndClearExpired(ttlHours = DEFAULT_TTL_HOURS) {
  const seededAt = localStorage.getItem(MOCK_SEEDED_KEY)
  if (!seededAt) return false

  const elapsed = Date.now() - Number(seededAt)
  const ttlMs = ttlHours * 60 * 60 * 1000

  if (elapsed > ttlMs) {
    clearAllMockData()
    return true
  }
  return false
}

export function clearAllMockData() {
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

export function getSeededAt() {
  const ts = localStorage.getItem(MOCK_SEEDED_KEY)
  return ts ? new Date(Number(ts)) : null
}

// ============================================================
// CRUD Operations per Collection
// ============================================================

export function getAll(collection) {
  return readCollection(collection) || []
}

export function getById(collection, id) {
  const items = getAll(collection)
  return items.find((item) => item.id === id) || null
}

export function create(collection, item) {
  const items = getAll(collection)
  const newItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  items.push(newItem)
  writeCollection(collection, items)
  return newItem
}

export function update(collection, id, updates) {
  const items = getAll(collection)
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null

  items[index] = {
    ...items[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  writeCollection(collection, items)
  return items[index]
}

export function remove(collection, id) {
  const items = getAll(collection)
  const filtered = items.filter((item) => item.id !== id)
  if (filtered.length === items.length) return false
  writeCollection(collection, filtered)
  return true
}

// ============================================================
// Seed Default Data
// ============================================================

export function seedCollection(collection, defaultData) {
  const existing = readCollection(collection)
  if (existing && existing.length > 0) return existing

  writeCollection(collection, defaultData)
  return defaultData
}

export function seedAll(seedMap) {
  const result = {}
  for (const [collection, data] of Object.entries(seedMap)) {
    result[collection] = seedCollection(collection, data)
  }
  localStorage.setItem(MOCK_SEEDED_KEY, String(Date.now()))
  return result
}

// ============================================================
// Stats / Summary helpers
// ============================================================

export function getCollectionCount(collection) {
  return getAll(collection).length
}

export function getStorageInfo() {
  let totalSize = 0
  let collections = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key)
      totalSize += (key.length + (value?.length || 0)) * 2 // UTF-16
      const name = key.replace(STORAGE_PREFIX, '')
      if (!['enabled', 'seeded_at'].includes(name)) {
        const data = value ? JSON.parse(value) : []
        collections.push({ name, count: Array.isArray(data) ? data.length : 0 })
      }
    }
  }
  return {
    totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
    collections,
    seededAt: getSeededAt(),
    mockEnabled: isMockEnabled(),
  }
}
