import { AndroidFlavor, APP_INFO_PLUGIN, AppInfoPlugin } from '@airgap/angular-core'
import { Component, Inject } from '@angular/core'
import { Capacitor } from '@capacitor/core'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import type { IpcRenderer } from 'electron'

declare global {
  interface Window {
    require: (
      module: 'electron'
    ) => {
      ipcRenderer: IpcRenderer
    }
  }
}

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  public appName: string = 'APP_NAME'
  public packageName: string = 'PACKAGE_NAME'
  public versionName: string = 'VERSION_NUMBER'
  public versionCode: string | number = 'VERSION_CODE'
  public appInfo: {
    appName: string
    packageName: string
    versionName: string
    versionCode: number
    productFlavor?: AndroidFlavor
  }

  constructor(@Inject(APP_INFO_PLUGIN) private readonly appInfoPlugin: AppInfoPlugin) {
    this.updateVersions().catch(handleErrorSentry(ErrorCategory.CORDOVA_PLUGIN))
  }

  public async updateVersions(): Promise<void> {
    if (Capacitor.getPlatform() === 'electron') {
      if (window.require) {
        // TODO: Look into ElectronProcess
        const { ipcRenderer } = window.require('electron')
        this.appInfo = ipcRenderer.sendSync('AppInfo', '')
      }
    } else {
      this.appInfo = await this.appInfoPlugin.get()
    }

    this.appName = this.appInfo.appName
    this.packageName = this.appInfo.packageName
    this.versionName = this.appInfo.versionName
    this.versionCode = this.appInfo.versionCode
  }
}
