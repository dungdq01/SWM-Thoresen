import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.smartlog.swm',
  appName: 'SmartLog WMS',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0b1628',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK' as const,
      backgroundColor: '#0b1628',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    } as any,
  },
  // Dev server URL for live reload (uncomment when developing)
  // server: {
  //   url: 'http://192.168.1.26:8386',
  //   cleartext: true,
  // },
}

export default config
