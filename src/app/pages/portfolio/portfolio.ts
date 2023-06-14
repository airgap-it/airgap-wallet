import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { forkJoin, from, Observable, Subscription } from 'rxjs'
import { Platform } from '@ionic/angular'

import { CryptoToFiatPipe } from '../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'
import { AccountProvider, MainWalletGroup } from '../../services/account/account.provider'
import { DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { ProtocolService } from '@airgap/angular-core'
import BigNumber from 'bignumber.js'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { map, take } from 'rxjs/operators'
import { ShopService } from 'src/app/services/shop/shop.service'

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
  public walletGroups: Observable<MainWalletGroup[]>
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
    public platform: Platform,
    private readonly shopService: ShopService
  ) {
    this.isDesktop = !this.platform.is('hybrid')

    this.wallets = this.walletsProvider.wallets$.asObservable()
    this.activeWallets = this.wallets.pipe(map((wallets) => wallets.filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE) ?? []))
    this.walletGroups = walletsProvider.walletsGroupedByMainWallet$

    // If a wallet gets added or removed, recalculate all values
    const walletSub = this.wallets.subscribe(() => {
      this.calculateTotal(this.walletsProvider.getActiveWalletList())
    })
    this.subscriptions.push(walletSub)
    const walletChangedSub = this.walletsProvider.walletChangedObservable.subscribe(() => {
      this.calculateTotal(this.walletsProvider.getActiveWalletList())
    })
    this.subscriptions.push(walletChangedSub)

    this.shopService.getShopData().then((response) => {
      this.shopBannerText = response.data.text
      this.shopBannerLink = response.data.link
    })
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

    const url = `/account-transaction-list/${DataServiceKey.ACCOUNTS}/${info.wallet.publicKey}/${info.wallet.protocol.identifier}/${info.wallet.addressIndex}`

    this.router
      .navigateByUrl(url, { state: { parentWalletName: info.mainWallet ? info.mainWallet.protocol.name : undefined } })
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
    if (this.shopBannerLink.length > 0) {
      window.open(this.shopBannerLink, '_blank')
    }
  }
}
