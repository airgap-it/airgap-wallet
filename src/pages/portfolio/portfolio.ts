import { animate, state, style, transition, trigger } from '@angular/animations'
import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { Observable } from 'rxjs'
import { WalletsProvider } from '../../providers/wallets/wallets.provider'
import { CoinInfoPage } from '../coin-info/coin-info'
import { ScanSyncPage } from '../scan-sync/scan-sync'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { CryptoToFiatPipe } from '../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'

@Component({
  selector: 'page-portfolio',
  templateUrl: 'portfolio.html',
  animations: [
    trigger('visibilityChanged', [
      state('shown', style({ opacity: 1 })),
      state('hidden', style({ opacity: 0 })),
      transition('* => *', animate('500ms'))
    ])
  ]

})
export class PortfolioPage {

  isVisible = 'hidden'

  total: number = 0
  changePercentage: number = 0

  wallets: Observable<AirGapMarketWallet[]>

  constructor(public navCtrl: NavController, public navParams: NavParams, private walletsProvider: WalletsProvider) {
    this.wallets = this.walletsProvider.wallets.asObservable()
  }

  ionViewDidEnter() {
    this.doRefresh()
  }

  openDetail(wallet: AirGapMarketWallet) {
    this.navCtrl.push(CoinInfoPage, { wallet: wallet })
  }

  openSyncPage() {
    this.navCtrl.push(ScanSyncPage)
  }

  doRefresh(refresher: any = null) {
    Promise.all(
      this.walletsProvider.wallets.getValue().map(wallet => {
        return wallet.synchronize()
      })
    ).then((results) => {
      let newTotal = 0

      let cryptoToFiatPipe = new CryptoToFiatPipe()

      results.map((result, index) => {
        let wallet = this.walletsProvider.wallets.getValue()[index]
        let fiatValue = cryptoToFiatPipe.transform(wallet.currentBalance, { protocolIdentifier: wallet.protocolIdentifier, currentMarketPrice: wallet.currentMarketPrice })
        newTotal += Number(fiatValue)
      })

      if (refresher) {
        refresher.complete()
      }

      this.total = newTotal
      this.isVisible = 'visible'
    })
  }
}
