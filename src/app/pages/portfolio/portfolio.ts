import { Component } from '@angular/core'
import { Observable, ReplaySubject } from 'rxjs'
import { Router } from '@angular/router'

import { AccountProvider } from '../../services/account/account.provider'
import { AirGapMarketWallet, ICoinSubProtocol } from 'airgap-coin-lib'
import { CryptoToFiatPipe } from '../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'
import { handleErrorSentry, ErrorCategory } from '../../services/sentry-error-handler/sentry-error-handler'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx'

interface WalletGroup {
  mainWallet: AirGapMarketWallet
  subWallets: AirGapMarketWallet[]
}

@Component({
  selector: 'page-portfolio',
  templateUrl: 'portfolio.html',
  styleUrls: ['./portfolio.scss']
})
export class PortfolioPage {
  isVisible = 'hidden'

  total: number = 0
  changePercentage: number = 0

  wallets: Observable<AirGapMarketWallet[]>
  walletGroups: ReplaySubject<WalletGroup[]> = new ReplaySubject(1)

  constructor(
    private router: Router,
    private walletsProvider: AccountProvider,
    private operationsProvider: OperationsProvider,
    private dataService: DataService,
    private qrScanner: QRScanner
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
    this.dataService.setData(DataServiceKey.WALLET, wallet)
    this.router.navigateByUrl('/account-transaction-list/' + DataServiceKey.WALLET).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  openAccountAddPage() {
    this.router.navigateByUrl('/account-add').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  async doRefresh(event: any = null) {
    // XTZ: Refresh delegation status
    this.operationsProvider.refreshAllDelegationStatuses()

    await Promise.all([
      this.walletsProvider.getWalletList().map(wallet => {
        return wallet.synchronize()
      })
    ])

    this.calculateTotal(this.walletsProvider.getWalletList(), event ? event.target : null)
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
