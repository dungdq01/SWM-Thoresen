import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Detect platform (web / ios / android) and provide mobile-related flags.
 */
export function usePlatform() {
  const [platform] = useState(() => Capacitor.getPlatform()) // 'web' | 'ios' | 'android'
  const isNative = platform !== 'web'
  const isIos = platform === 'ios'
  const isAndroid = platform === 'android'

  // Detect mobile viewport (< 1024px) OR native app OR PWA standalone
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    if (isNative) return true
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    return window.innerWidth < 1024
  })

  useEffect(() => {
    if (isNative) return // always mobile on native

    const mqlWidth = window.matchMedia('(max-width: 1023px)')
    const mqlStandalone = window.matchMedia('(display-mode: standalone)')

    const update = () => {
      setIsMobile(mqlWidth.matches || mqlStandalone.matches)
    }

    mqlWidth.addEventListener('change', update)
    mqlStandalone.addEventListener('change', update)
    return () => {
      mqlWidth.removeEventListener('change', update)
      mqlStandalone.removeEventListener('change', update)
    }
  }, [isNative])

  // Bottom nav disabled
  const showBottomNav = false

  return { platform, isNative, isIos, isAndroid, isMobile, showBottomNav }
}
