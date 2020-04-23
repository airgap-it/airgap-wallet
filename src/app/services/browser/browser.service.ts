import { Injectable, Inject } from '@angular/core'
import { Platform } from '@ionic/angular'
import { AppPlugin, BrowserPlugin } from '@capacitor/core'

import { APP_PLUGIN, BROWSER_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

@Injectable({
  providedIn: 'root'
})
export class BrowserService {
  constructor(
    private readonly platform: Platform,
    @Inject(APP_PLUGIN) private readonly app: AppPlugin,
    @Inject(BROWSER_PLUGIN) private readonly browser: BrowserPlugin
  ) {}

  public openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      this.app.openUrl({ url })
    } else {
      this.browser.open({ url })
    }
  }
}
