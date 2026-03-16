import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * Hook phát hiện platform (web/ios/android) và chế độ hiển thị.
 * Dùng để điều chỉnh UI giữa desktop web và mobile native app.
 */
export function usePlatform() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const platform = Capacitor.getPlatform() // 'web' | 'ios' | 'android'
  const isNative = Capacitor.isNativePlatform()
  const isIos = platform === 'ios'
  const isAndroid = platform === 'android'

  return {
    platform,
    isNative,
    isIos,
    isAndroid,
    isWeb: platform === 'web',
    isMobile,
    isDesktop: !isMobile,
    // true khi cần hiển thị bottom nav (native app hoặc mobile web)
    showBottomNav: isMobile,
    // true khi cần safe-area padding (native app trên iOS)
    needsSafeArea: isNative && isIos,
  }
}
