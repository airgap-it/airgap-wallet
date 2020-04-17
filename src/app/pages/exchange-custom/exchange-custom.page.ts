import { Component } from '@angular/core'
import { Platform } from '@ionic/angular'
var cordova: any

@Component({
  selector: 'page-exchange-custom',
  templateUrl: './exchange-custom.page.html',
  styleUrls: ['./exchange-custom.page.scss']
})
export class ExchangeCustomPage {
  constructor(public readonly platform: Platform) {}

  getTZBTC(gatekeeper: string) {
    switch (gatekeeper) {
      case 'bitcoin-suisse':
        this.openUrl('https://www.bitcoinsuisse.com/')
        break
      case 'woorton':
        this.openUrl('https://www.woorton.com/')
        break
      case 'taurus':
        this.openUrl('https://www.taurusgroup.ch/en')
        break
    }
  }

  private openUrl(url: string): void {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }
}
