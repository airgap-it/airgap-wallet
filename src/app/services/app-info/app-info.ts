import { Platform } from '@ionic/angular'
import { AppVersion } from '@ionic-native/app-version/ngx'
import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root'
})
export class AppInfoProvider {
  public appName = 'APP_NAME'
  public packageName = 'PACKAGE_NAME'
  public versionNumber = 'VERSION_NUMBER'
  public versionCode: string | number = 'VERSION_CODE'

  private isInitialized: Promise<void>

  constructor(private app: AppVersion, private platform: Platform) {
    this.isInitialized = this.updateVersions()
  }

  async updateVersions() {
    if (this.platform.is('cordova')) {
      await this.platform.ready()
      this.appName = await this.app.getAppName()
      this.packageName = await this.app.getPackageName()
      this.versionNumber = await this.app.getVersionNumber()
      this.versionCode = await this.app.getVersionCode()
    }
  }

  async getAppName() {
    await this.isInitialized
    return this.appName
  }

  async getPackageName() {
    await this.isInitialized
    return this.packageName
  }

  async getVersionNumber() {
    await this.isInitialized
    return this.versionNumber
  }

  async getVersionCode() {
    await this.isInitialized
    return this.versionCode
  }
}
