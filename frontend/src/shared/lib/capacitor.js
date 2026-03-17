import { Capacitor } from '@capacitor/core'

/**
 * Initialize native Capacitor plugins when running as a native app.
 * Safe to call on web — each plugin import is guarded.
 */
export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return

  try {
    // Status bar
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0b1628' })
  } catch { /* web fallback */ }

  try {
    // Keyboard — push content up
    const { Keyboard } = await import('@capacitor/keyboard')
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open')
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open')
    })
  } catch { /* web fallback */ }

  try {
    // App — handle back button on Android
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        App.exitApp()
      }
    })
  } catch { /* web fallback */ }

  try {
    // Splash screen
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch { /* web fallback */ }
}
