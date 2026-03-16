/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/status-bar" />
/// <reference types="@capacitor/keyboard" />
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.smartlog.swm',
  appName: 'SmartLog SWM',
  webDir: 'dist',
  server: {
    // Trong dev, trỏ về Vite dev server. Comment lại khi build production.
    // url: 'http://192.168.1.x:8386',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0c1829',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0c1829',
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
}

export default config
