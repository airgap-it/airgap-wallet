import { InjectionToken } from '@angular/core'
import {
  AppPlugin,
  BrowserPlugin,
  ClipboardPlugin,
  PermissionsPlugin,
  PushNotificationsPlugin,
  SharePlugin,
  SplashScreenPlugin,
  StatusBarPlugin
} from '@capacitor/core'
import { AppInfoPlugin } from './definitions'

export const APP_PLUGIN = new InjectionToken<AppPlugin>('AppPlugin')
export const APP_INFO_PLUGIN = new InjectionToken<AppInfoPlugin>('AppInfoPlugin')
export const BROWSER_PLUGIN = new InjectionToken<BrowserPlugin>('BrowserPlugin')
export const CLIPBOARD_PLUGIN = new InjectionToken<ClipboardPlugin>('ClipboardPlugin')
export const PERMISSIONS_PLUGIN = new InjectionToken<PermissionsPlugin>('PermissionsPlugin')
export const PUSH_NOTIFICATIONS_PLUGIN = new InjectionToken<PushNotificationsPlugin>('PushNotificationsPlugin')
export const SHARE_PLUGIN = new InjectionToken<SharePlugin>('SharePlugin')
export const SPLASH_SCREEN_PLUGIN = new InjectionToken<SplashScreenPlugin>('SplashScreenPlugin')
export const STATUS_BAR_PLUGIN = new InjectionToken<StatusBarPlugin>('StatusBarPlugin')
