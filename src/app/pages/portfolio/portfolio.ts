import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { AirGapMarketWallet, ICoinSubProtocol } from '@airgap/coinlib-core'
import { forkJoin, from, Observable, ReplaySubject, Subscription } from 'rxjs'
import { Platform } from '@ionic/angular'

import { CryptoToFiatPipe } from '../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'
import { AccountProvider } from '../../services/account/account.provider'
import { DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { ProtocolService } from '@airgap/angular-core'
import BigNumber from 'bignumber.js'
import { AirGapWallet, AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { map, take } from 'rxjs/operators'
import axios from 'axios'

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
  public activeWallets: Observable<AirGapMarketWallet[]>
  public walletGroups: ReplaySubject<WalletGroup[]> = new ReplaySubject(1)
  public isDesktop: boolean = false

  public readonly AirGapWalletStatus: typeof AirGapWalletStatus = AirGapWalletStatus

  private subscriptions: Subscription[] = []

  // Shop banner
  public shopBannerText: string = ''
  public shopBannerLink: string = ''

  constructor(
    private readonly router: Router,
    private readonly walletsProvider: AccountProvider,
    private readonly operationsProvider: OperationsProvider,
    private readonly protocolService: ProtocolService,
    public platform: Platform
  ) {
    this.isDesktop = !this.platform.is('hybrid')

    this.wallets = this.walletsProvider.wallets$.asObservable()
    this.activeWallets = this.wallets.pipe(map((wallets) => wallets.filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE) ?? []))

    // If a wallet gets added or removed, recalculate all values
    const walletSub = this.wallets.subscribe((wallets: AirGapMarketWallet[]) => {
      this.calculateTotal(this.walletsProvider.getActiveWalletList())

      this.refreshWalletGroups(wallets)
    })
    this.subscriptions.push(walletSub)
    const walletChangedSub = this.walletsProvider.walletChangedObservable.subscribe(() => {
      this.calculateTotal(this.walletsProvider.getActiveWalletList())
    })
    this.subscriptions.push(walletChangedSub)

    const url = `https://cors-proxy.airgap.prod.gke.papers.tech/proxy?url=${encodeURI('https://airgap.it/wallet-announcement/')}`
    axios.get<{ text: string, link: string }>(url).then(response => {
      this.shopBannerText = response.data.text
      this.shopBannerLink = response.data.link
    })
  }

  private refreshWalletGroups(wallets: AirGapMarketWallet[]) {
    const groups: WalletGroup[] = []

    const walletMap: Map<string, WalletGroup> = new Map()

    wallets
      .filter((wallet: AirGapWallet) => wallet.status === AirGapWalletStatus.ACTIVE)
      .forEach((wallet: AirGapMarketWallet) => {
        const isSubProtocol: boolean = ((wallet.protocol as any) as ICoinSubProtocol).isSubProtocol
        const identifier: string = isSubProtocol ? wallet.protocol.identifier.split('-')[0] : wallet.protocol.identifier

        const walletKey: string = `${wallet.publicKey}_${identifier}`

        if (walletMap.has(walletKey)) {
          const group: WalletGroup = walletMap.get(walletKey)
          if (isSubProtocol) {
            group.subWallets.push(wallet)
          } else {
            group.mainWallet = wallet
          }
        } else {
          if (isSubProtocol) {
            walletMap.set(walletKey, { mainWallet: undefined, subWallets: [wallet] })
          } else {
            walletMap.set(walletKey, { mainWallet: wallet, subWallets: [] })
          }
        }
      })

    walletMap.forEach((value: WalletGroup) => {
      groups.push(value)
    })

    groups.sort((group1: WalletGroup, group2: WalletGroup) => {
      if (group1.mainWallet && group2.mainWallet) {
        return group1.mainWallet.protocol.symbol.localeCompare(group2.mainWallet.protocol.symbol)
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

  public openDetail(mainWallet: AirGapMarketWallet, subWallet?: AirGapMarketWallet) {
    const info = subWallet
      ? {
          mainWallet,
          wallet: subWallet
        }
      : {
          wallet: mainWallet
        }
    this.router
      .navigateByUrl(
        `/account-transaction-list/${DataServiceKey.ACCOUNTS}/${info.wallet.publicKey}/${info.wallet.protocol.identifier}/${info.wallet.addressIndex}`
      )
      .catch(console.error)
  }

  public openAccountAddPage() {
    this.router.navigateByUrl('/account-add').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async doRefresh(event: any = null) {
    // XTZ: Refresh delegation status
    this.operationsProvider.refreshAllDelegationStatuses(this.walletsProvider.getActiveWalletList())

    const observables = [
      this.walletsProvider.getActiveWalletList().map((wallet) => {
        return from(wallet.synchronize())
      })
    ]
    /**
     * if we use await Promise.all() instead, then each wallet
     * is synchronized asynchronously, leading to blocking behaviour.
     * Instead we want to synchronize all wallets simultaneously
     */
    const allWalletsSynced = forkJoin([observables])

    allWalletsSynced.pipe(take(1)).subscribe(() => {
      this.calculateTotal(this.walletsProvider.getActiveWalletList(), event ? event.target : null)
      this.wallets.pipe(take(1)).subscribe((wallets) => this.refreshWalletGroups(wallets))
    })
  }

  public async calculateTotal(wallets: AirGapMarketWallet[], refresher: any = null): Promise<void> {
    const cryptoToFiatPipe = new CryptoToFiatPipe(this.protocolService)
    wallets = wallets.filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE)
    this.total = (
      await Promise.all(
        wallets.map((wallet) =>
          cryptoToFiatPipe.transform(wallet.getCurrentBalance(), {
            protocolIdentifier: wallet.protocol.identifier,
            currentMarketPrice: wallet.getCurrentMarketPrice()
          })
        )
      )
    )
      .reduce((sum: BigNumber, next: string) => sum.plus(next), new BigNumber(0))
      .toNumber()

    if (refresher) {
      refresher.complete()
    }

    this.isVisible = 'visible'
  }

  public ngOnDestroy(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe()
    }
    this.subscriptions = []
  }

  public onClickShopBanner() {
    if (this.shopBannerLink.length > 0) window.open(this.shopBannerLink, '_blank')
  }
}
