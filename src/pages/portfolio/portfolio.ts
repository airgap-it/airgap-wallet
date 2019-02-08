import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { Observable } from 'rxjs'
import { AccountProvider } from '../../providers/account/account.provider'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { CryptoToFiatPipe } from '../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AddAccountPage } from '../add-account/add-account'
import { AccountDetailPage } from '../account-detail/account-detail'
import { AccountTransactionListPage } from '../account-transaction-list/account-transaction-list'

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

  constructor(public navCtrl: NavController, public navParams: NavParams, private walletsProvider: AccountProvider) {
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
    this.doRefresh().catch(handleErrorSentry())
  }

  openDetail(wallet: AirGapMarketWallet) {
    if (wallet.coinProtocol.subProtocols && wallet.coinProtocol.subProtocols.length > 0) {
      this.navCtrl.push(AccountDetailPage, { wallet: wallet }).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      this.navCtrl.push(AccountTransactionListPage, { wallet: wallet }).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  openAddAccountPage() {
    this.navCtrl.push(AddAccountPage).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
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
