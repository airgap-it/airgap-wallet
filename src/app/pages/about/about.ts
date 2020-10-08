import { APP_INFO_PLUGIN, AppInfoPlugin } from '@airgap/angular-core'
import { Component, Inject } from '@angular/core'

import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  public appName: string = 'APP_NAME'
  public packageName: string = 'PACKAGE_NAME'
  public versionName: string = 'VERSION_NUMBER'
  public versionCode: string | number = 'VERSION_CODE'

  constructor(@Inject(APP_INFO_PLUGIN) private readonly appInfo: AppInfoPlugin) {
    this.updateVersions().catch(handleErrorSentry(ErrorCategory.CORDOVA_PLUGIN))
  }

  public async updateVersions(): Promise<void> {
    const appInfo = await this.appInfo.get()

    this.appName = appInfo.appName
    this.packageName = appInfo.packageName
    this.versionName = appInfo.versionName
    this.versionCode = appInfo.versionCode
  }
}
