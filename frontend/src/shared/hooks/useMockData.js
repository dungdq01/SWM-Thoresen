import { useState, useCallback, useEffect } from 'react'
import {
  getAll,
  create,
  update,
  remove,
  seedAll,
  isMockEnabled,
  setMockEnabled,
  checkAndClearExpired,
  clearAllMockData,
  getStorageInfo,
} from '@shared/lib/mockStorage'

/**
 * Hook quản lý mock data với localStorage persistence.
 * 
 * @param {string} collection - Tên collection (e.g. 'dashboard_stats')
 * @param {object} options
 * @param {Array} options.defaultData - Data seed mặc định
 * @param {boolean} options.autoSeed - Tự động seed nếu chưa có (default: true)
 */
export function useMockData(collection, { defaultData = [], autoSeed = true } = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  // Load data từ localStorage khi mount
  useEffect(() => {
    checkAndClearExpired()

    let items = getAll(collection)
    if (items.length === 0 && autoSeed && defaultData.length > 0) {
      seedAll({ [collection]: defaultData })
      items = defaultData
    }
    setData(items)
    setLoading(false)
  }, [collection])

  const refresh = useCallback(() => {
    setData(getAll(collection))
  }, [collection])

  const addItem = useCallback((item) => {
    const newItem = create(collection, item)
    setData(getAll(collection))
    return newItem
  }, [collection])

  const updateItem = useCallback((id, updates) => {
    const updated = update(collection, id, updates)
    setData(getAll(collection))
    return updated
  }, [collection])

  const removeItem = useCallback((id) => {
    const success = remove(collection, id)
    if (success) setData(getAll(collection))
    return success
  }, [collection])

  const resetToDefault = useCallback(() => {
    clearAllMockData()
    seedAll({ [collection]: defaultData })
    setData(defaultData)
  }, [collection, defaultData])

  return {
    data,
    loading,
    refresh,
    addItem,
    updateItem,
    removeItem,
    resetToDefault,
    count: data.length,
  }
}

/**
 * Hook quản lý toggle mock data ON/OFF
 */
export function useMockToggle() {
  const [enabled, setEnabled] = useState(isMockEnabled)

  const toggle = useCallback(() => {
    const next = !enabled
    setMockEnabled(next)
    setEnabled(next)
  }, [enabled])

  const info = getStorageInfo()

  return { enabled, toggle, info }
}
