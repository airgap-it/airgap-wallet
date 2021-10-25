import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: "it.airgap.wallet",
  appName: "AirGap Wallet",
  bundledWebRuntime: false,
  webDir: "www",
  plugins: {
    PushNotifications: {
      presentationOptions: ["alert"]
    },
    SplashScreen: {
      launchAutoHide: false,
      androidSplashResourceName: "screen"
    }
  },
  android: {
    allowMixedContent: true
  }
}

export default config