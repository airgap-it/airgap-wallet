import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { QRScanner } from '@ionic-native/qr-scanner/ngx'
import { AirGapMarketWallet, ICoinSubProtocol } from 'airgap-coin-lib'
import { Observable, ReplaySubject } from 'rxjs'

import { CryptoToFiatPipe } from '../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'
import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

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
  public isVisible = 'hidden'

  public total: number = 0
  public changePercentage: number = 0

  public wallets: Observable<AirGapMarketWallet[]>
  public walletGroups: ReplaySubject<WalletGroup[]> = new ReplaySubject(1)

  constructor(
    private readonly router: Router,
    private readonly walletsProvider: AccountProvider,
    private readonly operationsProvider: OperationsProvider,
    private readonly dataService: DataService,
    private readonly qrScanner: QRScanner
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

  public ionViewDidEnter() {
    this.doRefresh().catch(handleErrorSentry())
  }

  public openDetail(wallet: AirGapMarketWallet) {
    this.dataService.setData(DataServiceKey.WALLET, wallet)
    this.router.navigateByUrl('/account-transaction-list/' + DataServiceKey.WALLET).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public openAccountAddPage() {
    this.router.navigateByUrl('/account-add').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async doRefresh(event: any = null) {
    // XTZ: Refresh delegation status
    this.operationsProvider.refreshAllDelegationStatuses()

    await Promise.all([
      this.walletsProvider.getWalletList().map(wallet => {
        return wallet.synchronize()
      })
    ])

    this.calculateTotal(this.walletsProvider.getWalletList(), event ? event.target : null)
  }

  public calculateTotal(wallets: AirGapMarketWallet[], refresher: any = null) {
    console.log('calculating total')
    let newTotal = 0
    const cryptoToFiatPipe = new CryptoToFiatPipe()

    wallets.forEach(wallet => {
      const fiatValue = cryptoToFiatPipe.transform(wallet.currentBalance, {
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
