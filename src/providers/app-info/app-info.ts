import { Platform } from 'ionic-angular'
import { AppVersion } from '@ionic-native/app-version'
import { Injectable } from '@angular/core'

@Injectable()
export class AppInfoProvider {
  public appName = 'APP_NAME'
  public packageName = 'PACKAGE_NAME'
  public versionNumber = 'VERSION_NUMBER'
  public versionCode = 'VERSION_CODE'

  constructor(private app: AppVersion, private platform: Platform) {
    this.updateVersions()
  }

  async updateVersions() {
    if (this.platform.is('cordova')) {
      this.appName = await this.app.getAppName()
      this.packageName = await this.app.getPackageName()
    }
  }

  getAppName() {
    return this.appName
  }

  getPackageName() {
    return this.packageName
  }

  getVersionNumber() {
    return this.versionNumber
  }

  getVersionCode() {
    return this.versionCode
  }
}
