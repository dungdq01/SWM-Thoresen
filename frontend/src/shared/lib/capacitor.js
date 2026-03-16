import { Capacitor } from '@capacitor/core'

/**
 * Khởi tạo các plugin Capacitor khi chạy trên native (Android/iOS).
 * Gọi 1 lần trong main.jsx sau khi app mount.
 */
export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return

  const platform = Capacitor.getPlatform()

  // ── StatusBar ──
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0c1829' })
    if (platform === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false })
    }
  } catch (e) {
    console.warn('[Capacitor] StatusBar plugin not available:', e)
  }

  // ── Keyboard ──
  try {
    const { Keyboard } = await import('@capacitor/keyboard')
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`)
      document.body.classList.add('keyboard-open')
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px')
      document.body.classList.remove('keyboard-open')
    })
  } catch (e) {
    console.warn('[Capacitor] Keyboard plugin not available:', e)
  }

  // ── App (Back button trên Android) ──
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        App.exitApp()
      }
    })
  } catch (e) {
    console.warn('[Capacitor] App plugin not available:', e)
  }

  // ── SplashScreen — tự ẩn sau khi app sẵn sàng ──
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch (e) {
    console.warn('[Capacitor] SplashScreen plugin not available:', e)
  }
}
