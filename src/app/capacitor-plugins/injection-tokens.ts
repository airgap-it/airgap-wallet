import { InjectionToken } from '@angular/core'
import { BrowserPlugin, PushNotificationsPlugin, SharePlugin } from '@capacitor/core'

export const BROWSER_PLUGIN = new InjectionToken<BrowserPlugin>('BrowserPlugin')
export const PUSH_NOTIFICATIONS_PLUGIN = new InjectionToken<PushNotificationsPlugin>('PushNotificationsPlugin')
export const SHARE_PLUGIN = new InjectionToken<SharePlugin>('SharePlugin')
