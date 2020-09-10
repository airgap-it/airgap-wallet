import { APP_INFO_PLUGIN } from '@airgap/angular-core'
import { Inject, Injectable } from '@angular/core'
import { Platform } from '@ionic/angular'
import { AppInfoPlugin } from 'src/app/capacitor-plugins/definitions'

@Injectable({
  providedIn: 'root'
})
export class AppInfoProvider {
  public appName = 'APP_NAME'
  public packageName = 'PACKAGE_NAME'
  public versionNumber = 'VERSION_NUMBER'
  public versionCode: string | number = 'VERSION_CODE'

  private isInitialized: boolean = false

  constructor(private readonly platform: Platform, @Inject(APP_INFO_PLUGIN) private readonly appInfo: AppInfoPlugin) {}

  public async updateVersions() {
    if (this.platform.is('hybrid')) {
      await this.platform.ready()
      const appInfo = await this.appInfo.get()

      this.appName = appInfo.appName
      this.packageName = appInfo.packageName
      this.versionNumber = appInfo.versionName
      this.versionCode = appInfo.versionCode
    }

    this.isInitialized = true
  }

  public async getAppName() {
    await this.init()

    return this.appName
  }

  public async getPackageName() {
    await this.init()

    return this.packageName
  }

  public async getVersionNumber() {
    await this.init()

    return this.versionNumber
  }

  public async getVersionCode() {
    await this.init()

    return this.versionCode
  }

  private async init(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve()
    }

    return this.updateVersions()
  }
}
