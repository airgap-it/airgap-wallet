import { InjectionToken } from '@angular/core'
import { SplashScreenPlugin, StatusBarPlugin } from '@capacitor/core'

export const SPLASH_SCREEN_PLUGIN = new InjectionToken<SplashScreenPlugin>('SplashScreenPlugin')
export const STATUS_BAR_PLUGIN = new InjectionToken<StatusBarPlugin>('StatusBarPlugin')
