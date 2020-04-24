import { InjectionToken } from '@angular/core'
import { AppPlugin, BrowserPlugin, ClipboardPlugin, SplashScreenPlugin, StatusBarPlugin } from '@capacitor/core'

export const APP_PLUGIN = new InjectionToken<AppPlugin>('AppPlugin')
export const BROWSER_PLUGIN = new InjectionToken<BrowserPlugin>('BrowserPlugin')
export const CLIPBOARD_PLUGIN = new InjectionToken<ClipboardPlugin>('ClipboardPlugin')
export const SPLASH_SCREEN_PLUGIN = new InjectionToken<SplashScreenPlugin>('SplashScreenPlugin')
export const STATUS_BAR_PLUGIN = new InjectionToken<StatusBarPlugin>('StatusBarPlugin')
