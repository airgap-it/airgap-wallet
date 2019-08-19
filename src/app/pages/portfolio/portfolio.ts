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
    private readonly dataService: DataService
  ) {
    this.wallets = this.walletsProvider.wallets.asObservable()

    // If a wallet gets added or removed, recalculate all values
    this.wallets.subscribe((wallets: AirGapMarketWallet[]) => {
      this.calculateTotal(wallets)

      this.refreshWalletGroups(wallets)
    })
    this.walletsProvider.walledChangedObservable.subscribe(() => {
      this.calculateTotal(this.walletsProvider.getWalletList())
    })
  }

  private refreshWalletGroups(wallets: AirGapMarketWallet[]) {
    const groups: WalletGroup[] = []

    const walletMap: Map<string, WalletGroup> = new Map()

    wallets.forEach((wallet: AirGapMarketWallet) => {
      const isSubProtocol: boolean = ((wallet.coinProtocol as any) as ICoinSubProtocol).isSubProtocol
      if (walletMap.has(wallet.publicKey)) {
        const group: WalletGroup = walletMap.get(wallet.publicKey)
        if (isSubProtocol) {
          group.subWallets.push(wallet)
        } else {
          group.mainWallet = wallet
        }
      } else {
        if (isSubProtocol) {
          walletMap.set(wallet.publicKey, { mainWallet: undefined, subWallets: [wallet] })
        } else {
          walletMap.set(wallet.publicKey, { mainWallet: wallet, subWallets: [] })
        }
      }
    })

    walletMap.forEach((value: WalletGroup) => {
      groups.push(value)
    })

    groups.sort((group1: WalletGroup, group2: WalletGroup) => {
      if (group1.mainWallet && group2.mainWallet) {
        return group1.mainWallet.coinProtocol.symbol.localeCompare(group2.mainWallet.coinProtocol.symbol)
      } else if (group1.mainWallet) {
        return -1
      } else if (group2.mainWallet) {
        return 1
      } else {
        return 0
      }
    })

    // TODO: Find a solution to this
    /*
    It seems like this is an Ionic / Angular bug. If a wallet is deleted on a sub-page
    (which is how it is done currently), then the UI end up in a weird state. There is no
    crash, but some wallets are not shown and empty cards are being displayed. To resolve this,
    the app has to be restarted or another wallet has to be added. When investigating,
    we saw that it is related to the transition phase. If the observable emits at the same time
    as the transition is happening, then this weird state occurs. If we simply wait, everything
    works as intended. 
    */
    setTimeout(() => {
      this.walletGroups.next(groups)
    }, 500)
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
