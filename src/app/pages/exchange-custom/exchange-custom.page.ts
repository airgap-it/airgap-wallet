import { Component } from '@angular/core'
import { Platform } from '@ionic/angular'

declare var cordova: any

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
        this.openUrl('https://login.bitcoinsuisse.com/Account/Register')
        break
      case 'bity':
        this.openUrl('mailto:tzBTC@bity.com')
        break
      case 'sygnum':
        this.openUrl('mailto:info@sygnum.com')
        break
      case 'taurus':
        this.openUrl('mailto:tradingdesk@taurusgroup.ch')
        break
      case 'woorton':
        this.openUrl('https://www.woorton.com/tzBTC.php')
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
