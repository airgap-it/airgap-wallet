import { APP_LAUNCHER_PLUGIN } from '@airgap/angular-core'
import { Inject, Injectable } from '@angular/core'
import { AppLauncherPlugin } from '@capacitor/app-launcher'
import { BrowserPlugin } from '@capacitor/browser'
import { Platform } from '@ionic/angular'

import { BROWSER_PLUGIN } from '../../capacitor-plugins/injection-tokens'

@Injectable({
  providedIn: 'root'
})
export class BrowserService {
  constructor(
    private readonly platform: Platform,
    @Inject(APP_LAUNCHER_PLUGIN) private readonly appLauncher: AppLauncherPlugin,
    @Inject(BROWSER_PLUGIN) private readonly browser: BrowserPlugin
  ) {}

  public async openUrl(url: string): Promise<void> {
    if (this.platform.is('ios') || this.platform.is('android') || this.platform.is('electron')) {
      await this.appLauncher.openUrl({ url })
    } else {
      await this.browser.open({ url })
    }
  }
}
