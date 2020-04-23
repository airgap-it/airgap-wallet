import { Component } from '@angular/core'
import { BrowserService } from 'src/app/services/browser/browser.service'

@Component({
  selector: 'page-exchange-custom',
  templateUrl: './exchange-custom.page.html',
  styleUrls: ['./exchange-custom.page.scss']
})
export class ExchangeCustomPage {
  constructor(private readonly browserService: BrowserService) {}

  getTZBTC(gatekeeper: string) {
    switch (gatekeeper) {
      case 'bitcoin-suisse':
        this.browserService.openUrl('https://login.bitcoinsuisse.com/Account/Register')
        break
      case 'bity':
        this.browserService.openUrl('mailto:tzBTC@bity.com')
        break
      case 'sygnum':
        this.browserService.openUrl('mailto:info@sygnum.com')
        break
      case 'taurus':
        this.browserService.openUrl('mailto:tradingdesk@taurusgroup.ch')
        break
      case 'woorton':
        this.browserService.openUrl('https://www.woorton.com/tzBTC.php')
        break
    }
  }
}
