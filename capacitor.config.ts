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
      // The app hides the splash screen itself as soon as its shell is rendered, see
      // AppComponent. The duration is only a backstop for when the web layer fails to
      // boot at all (e.g. a broken bundle), it plays no role in a normal start.
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