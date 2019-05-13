import { Component } from '@angular/core'

import { AppInfoProvider } from '../../services/app-info/app-info'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  public appName = ''
  public packageName = ''
  public versionNumber = ''
  public versionCode: string | number = ''

  constructor(private readonly appInfoProvider: AppInfoProvider) {
    this.updateVersions().catch(handleErrorSentry(ErrorCategory.OTHER))
  }

  public async updateVersions() {
    this.appName = await this.appInfoProvider.getAppName()
    this.packageName = await this.appInfoProvider.getPackageName()
    this.versionNumber = await this.appInfoProvider.getVersionNumber()
    this.versionCode = await this.appInfoProvider.getVersionCode()
  }
}
