import { Inject, Injectable } from '@angular/core'
import { Platform } from '@ionic/angular'
import { AndroidFlavor, AppInfoPlugin } from 'src/app/capacitor-plugins/definitions'
import { APP_INFO_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

@Injectable({
  providedIn: 'root'
})
export class AppInfoProvider {
  public appName: string = 'APP_NAME'
  public packageName: string = 'PACKAGE_NAME'
  public versionNumber: string = 'VERSION_NUMBER'
  public versionCode: string | number = 'VERSION_CODE'

  public androidFlavor: AndroidFlavor | undefined

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
      this.androidFlavor = appInfo.productFlavor
    }

    this.isInitialized = true
  }

  public async getAppName(): Promise<string> {
    await this.init()

    return this.appName
  }

  public async getPackageName(): Promise<string> {
    await this.init()

    return this.packageName
  }

  public async getVersionNumber(): Promise<string> {
    await this.init()

    return this.versionNumber
  }

  public async getVersionCode(): Promise<string | number> {
    await this.init()

    return this.versionCode
  }

  public async getAndroidFlavor(): Promise<AndroidFlavor | undefined> {
    await this.init()

    return this.androidFlavor
  }

  private async init(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve()
    }

    return this.updateVersions()
  }
}
