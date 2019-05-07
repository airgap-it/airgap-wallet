import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AppInfoProvider } from '../../providers/app-info/app-info'

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  public appName = ''
  public packageName = ''
  public versionNumber = ''
  public versionCode = ''

  constructor(public navCtrl: NavController, public navParams: NavParams, private appInfoProvider: AppInfoProvider) {
    this.updateVersions().catch(handleErrorSentry(ErrorCategory.OTHER))
  }

  async updateVersions() {
    this.appName = await this.appInfoProvider.getAppName()
    this.packageName = await this.appInfoProvider.getPackageName()
    this.versionNumber = await this.appInfoProvider.getVersionNumber()
    this.versionCode = await this.appInfoProvider.getVersionCode()
  }
}
