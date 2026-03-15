/**
 * useCommandPalette — Global state + keyboard shortcut (Ctrl+K / Cmd+K)
 * Dùng một module-level singleton để tránh context overhead,
 * vì chỉ có 1 palette trên toàn app.
 */
import { useState, useEffect, useCallback } from 'react'

// Module-level state (singleton)
let _isOpen = false
let _listeners = []

function notify() {
  _listeners.forEach(fn => fn(_isOpen))
}

function openPalette() {
  _isOpen = true
  notify()
}

function closePalette() {
  _isOpen = false
  notify()
}

function togglePalette() {
  _isOpen = !_isOpen
  notify()
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(_isOpen)

  useEffect(() => {
    const listener = (val) => setIsOpen(val)
    _listeners.push(listener)
    return () => {
      _listeners = _listeners.filter(l => l !== listener)
    }
  }, [])

  // Đăng ký Ctrl+K / Cmd+K — chỉ 1 lần ở root mount
  useEffect(() => {
    function handleKeyDown(e) {
      const isKKey = e.key === 'k' || e.key === 'K'
      const isModifier = e.ctrlKey || e.metaKey
      if (isKKey && isModifier) {
        e.preventDefault()
        togglePalette()
      }
      if (e.key === 'Escape' && _isOpen) {
        e.preventDefault()
        closePalette()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: useCallback(openPalette, []),
    close: useCallback(closePalette, []),
    toggle: useCallback(togglePalette, []),
  }
}
