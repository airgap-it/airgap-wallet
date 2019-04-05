import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { Observable, ReplaySubject } from 'rxjs'
import { AccountProvider } from '../../providers/account/account.provider'
import { AirGapMarketWallet, ICoinSubProtocol } from 'airgap-coin-lib'
import { CryptoToFiatPipe } from '../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AccountAddPage } from '../account-add/account-add'
import { AccountTransactionListPage } from '../account-transaction-list/account-transaction-list'
import { OperationsProvider } from '../../providers/operations/operations'
import { group } from '@angular/core/src/animation/dsl'

interface WalletGroup {
  mainWallet: AirGapMarketWallet
  subWallets: AirGapMarketWallet[]
}

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
  walletGroups: ReplaySubject<WalletGroup[]> = new ReplaySubject(1)

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private walletsProvider: AccountProvider,
    private operationsProvider: OperationsProvider
  ) {
    this.wallets = this.walletsProvider.wallets.asObservable()

    // If a wallet gets added or removed, recalculate all values
    this.wallets.subscribe(wallets => {
      this.calculateTotal(wallets)

      const groups: WalletGroup[] = []
      wallets.forEach(wallet => {
        if (((wallet.coinProtocol as any) as ICoinSubProtocol).isSubProtocol) {
          return
        }
        groups.push({
          mainWallet: wallet,
          subWallets: wallets.filter(subWallet => wallet !== subWallet && wallet.publicKey === subWallet.publicKey)
        })
      })

      groups.sort((group1, group2) => {
        return group1.mainWallet.coinProtocol.symbol.localeCompare(group2.mainWallet.coinProtocol.symbol)
      })

      this.walletGroups.next(groups)
    })
    this.walletsProvider.walledChangedObservable.subscribe(() => {
      this.calculateTotal(this.walletsProvider.getWalletList())
    })
  }

  ionViewDidEnter() {
    this.doRefresh().catch(handleErrorSentry())
  }

  openDetail(wallet: AirGapMarketWallet) {
    this.navCtrl.push(AccountTransactionListPage, { wallet: wallet }).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openAccountAddPage() {
    this.navCtrl.push(AccountAddPage).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  async doRefresh(refresher: any = null) {
    // XTZ: Refresh delegation status
    this.operationsProvider.refreshAllDelegationStatuses()

    await Promise.all([
      this.walletsProvider.getWalletList().map(wallet => {
        return wallet.synchronize()
      })
    ])

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
