/**
 * useDarkMode — Auto-detect + toggle Dark Mode (UX Principles Section 6)
 *
 * Logic:
 * 1. Đọc preference từ localStorage ('dark' | 'light' | null)
 * 2. Nếu null → dùng prefers-color-scheme từ OS
 * 3. Tự động gắn/bỏ class "dark" trên <html>
 * 4. Lắng nghe thay đổi OS preference khi user chưa override
 */
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'swm-color-scheme'

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getStoredPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return true
    if (stored === 'light') return false
  } catch {}
  return null
}

function applyDark(isDark) {
  const html = document.documentElement
  if (isDark) {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = getStoredPreference()
    return stored !== null ? stored : getSystemPreference()
  })

  // Áp dụng khi mount và khi thay đổi
  useEffect(() => {
    applyDark(isDark)
  }, [isDark])

  // Lắng nghe OS preference thay đổi (chỉ khi user chưa override)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (getStoredPreference() === null) {
        setIsDark(e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      } catch {}
      return next
    })
  }, [])

  const setMode = useCallback((dark) => {
    setIsDark(dark)
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch {}
  }, [])

  const resetToSystem = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setIsDark(getSystemPreference())
  }, [])

  return { isDark, toggle, setMode, resetToSystem }
}
