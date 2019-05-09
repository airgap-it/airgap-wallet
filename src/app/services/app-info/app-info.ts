import { Injectable } from '@angular/core'
import { AppVersion } from '@ionic-native/app-version/ngx'
import { Platform } from '@ionic/angular'

@Injectable({
  providedIn: 'root'
})
export class AppInfoProvider {
  public appName = 'APP_NAME'
  public packageName = 'PACKAGE_NAME'
  public versionNumber = 'VERSION_NUMBER'
  public versionCode: string | number = 'VERSION_CODE'

  private readonly isInitialized: Promise<void>

  constructor(private readonly app: AppVersion, private readonly platform: Platform) {
    this.isInitialized = this.updateVersions()
  }

  public async updateVersions() {
    if (this.platform.is('cordova')) {
      await this.platform.ready()
      this.appName = await this.app.getAppName()
      this.packageName = await this.app.getPackageName()
      this.versionNumber = await this.app.getVersionNumber()
      this.versionCode = await this.app.getVersionCode()
    }
  }

  public async getAppName() {
    await this.isInitialized

    return this.appName
  }

  public async getPackageName() {
    await this.isInitialized

    return this.packageName
  }

  public async getVersionNumber() {
    await this.isInitialized

    return this.versionNumber
  }

  public async getVersionCode() {
    await this.isInitialized

    return this.versionCode
  }
}
