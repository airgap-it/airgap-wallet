import { APP_PLUGIN } from '@airgap/angular-core'
import { Inject, Injectable } from '@angular/core'
import { AppPlugin, BrowserPlugin } from '@capacitor/core'
import { Platform } from '@ionic/angular'

import { BROWSER_PLUGIN } from '../../capacitor-plugins/injection-tokens'

@Injectable({
  providedIn: 'root'
})
export class BrowserService {
  constructor(
    private readonly platform: Platform,
    @Inject(APP_PLUGIN) private readonly app: AppPlugin,
    @Inject(BROWSER_PLUGIN) private readonly browser: BrowserPlugin
  ) {}

  public async openUrl(url: string): Promise<void> {
    if (this.platform.is('ios') || this.platform.is('android') || this.platform.is('electron')) {
      await this.app.openUrl({ url })
    } else {
      await this.browser.open({ url })
    }
  }
}
