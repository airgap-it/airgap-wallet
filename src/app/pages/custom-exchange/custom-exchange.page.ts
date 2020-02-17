import { Component } from '@angular/core'
import { Platform } from '@ionic/angular'
var cordova: any

@Component({
  selector: 'app-custom-exchange',
  templateUrl: './custom-exchange.page.html',
  styleUrls: ['./custom-exchange.page.scss']
})
export class CustomExchangePage {
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
