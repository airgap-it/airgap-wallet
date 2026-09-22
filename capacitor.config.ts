import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'it.airgap.wallet',
  appName: 'AirGap Wallet',
  bundledWebRuntime: false,
  webDir: 'www',
  plugins: {
    PushNotifications: {
      presentationOptions: ['alert']
    },
    SplashScreen: {
      // The app hides the splash screen itself once it is ready, see AppComponent.
      // The duration is only a backstop: if the web layer never gets that far, the
      // native side hides it anyway instead of leaving the user on the splash forever.
      launchAutoHide: true,
      launchShowDuration: 15000,
      androidSplashResourceName: 'screen'
    }
  },
  server: {
    androidScheme: 'http'
  },
  android: {
    allowMixedContent: true
  }
}

export default config