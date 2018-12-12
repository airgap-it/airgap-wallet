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
  animations: []
})
export class PortfolioPage {
  isVisible = 'hidden'

  total: number = 0
  changePercentage: number = 0

  wallets: Observable<AirGapMarketWallet[]>

  constructor(public navCtrl: NavController, public navParams: NavParams, private walletsProvider: WalletsProvider) {
    this.wallets = this.walletsProvider.wallets.asObservable()
    // If a wallet gets added or removed, recalculate all values
    this.wallets.subscribe(wallets => {
      this.calculateTotal(wallets)
    })
    this.walletsProvider.walledChangedObservable.subscribe(() => {
      this.calculateTotal(this.walletsProvider.getWalletList())
    })
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

  async doRefresh(refresher: any = null) {
    await Promise.all(
      this.walletsProvider.getWalletList().map(wallet => {
        return wallet.synchronize()
      })
    )

    this.calculateTotal(this.walletsProvider.getWalletList(), refresher)
  }

  calculateTotal(wallets: AirGapMarketWallet[], refresher: any = null) {
    console.log('calculating total')
    let newTotal = 0
    let cryptoToFiatPipe = new CryptoToFiatPipe()

    wallets.forEach(wallet => {
      let fiatValue = cryptoToFiatPipe.transform(wallet.currentBalance, {
        protocolIdentifier: wallet.protocolIdentifier,
        currentMarketPrice: wallet.currentMarketPrice
      })
      newTotal += Number(fiatValue)
    })

    if (refresher) {
      refresher.complete()
    }

    this.total = newTotal
    this.isVisible = 'visible'
  }
}
