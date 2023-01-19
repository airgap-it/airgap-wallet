import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { App } from '@capacitor/app'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

const rootPath: string = '/tabs/portfolio'

const paths: { path: string; prevPath: string }[] = [
  { path: '/tabs/settings', prevPath: rootPath },
  { path: '/tabs/exchange', prevPath: rootPath },
  { path: '/tabs/scan', prevPath: rootPath },
  { path: '/about', prevPath: '/tabs/settings' },
  { path: '/health-check', prevPath: '/tabs/settings' },
  { path: '/dapp-permission-list', prevPath: '/tabs/settings' },
  { path: '/dapp-settings', prevPath: '/tabs/settings' },
  { path: '/interaction-selection-settings', prevPath: '/tabs/settings' },
  { path: '/qr-settings', prevPath: '/tabs/settings' },
  { path: '/account-add', prevPath: rootPath },
  { path: '/account-import/sync-accounts', prevPath: rootPath },
  { path: '/account-transaction-list/accounts', prevPath: rootPath }
]

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  constructor(private readonly router: Router) {}

  handleBackNavigation(currentPath: string) {
    if (currentPath === rootPath) {
      App.exitApp()
      return
    }

    const prevpath = paths.find((p) => currentPath.includes(p.path))
    if (prevpath) {
      this.router.navigateByUrl(prevpath.prevPath).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }
}
