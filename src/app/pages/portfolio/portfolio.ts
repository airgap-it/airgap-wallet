import { ChangeDetectorRef, Component, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Observable, Subscription } from 'rxjs'
import { Platform } from '@ionic/angular'

import { ProtocolService } from '@airgap/angular-core'
import BigNumber from '@airgap/coinlib-core/dependencies/src/bignumber.js-9.0.0/bignumber'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { map } from 'rxjs/operators'
import { promiseTimeout } from '../../helpers/promise'
import { ShopService } from 'src/app/services/shop/shop.service'
import { CryptoToFiatPipe } from '../../pipes/crypto-to-fiat/crypto-to-fiat.pipe'
import { AccountProvider, MainWalletGroup } from '../../services/account/account.provider'
import { DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from '../../services/storage/storage'

@Component({
  selector: 'page-portfolio',
  templateUrl: 'portfolio.html',
  styleUrls: ['./portfolio.scss']
})
export class PortfolioPage {
  public isVisible: boolean = false
  public syncWarningNames: string[] = []

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

  // knox flip-card
  public knoxFlipCardLine1: string = ''
  public knoxFlipCardLine2: string = ''
  public knoxFlipCardLink: string = ''

  // Balance visibility
  public isBalanceHidden: boolean = false

  public constructor(
    private readonly router: Router,
    private readonly walletsProvider: AccountProvider,
    private readonly operationsProvider: OperationsProvider,
    private readonly protocolService: ProtocolService,
    public platform: Platform,
    private readonly shopService: ShopService,
    private readonly storageService: WalletStorageService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
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
      this.shopBannerText = ''
      this.shopBannerLink = ''

      if (typeof response.data === 'object') {
        if (typeof response.data.text === 'string') {
          this.shopBannerText = response.data.text
        }
        if (typeof response.data.link === 'string') {
          this.shopBannerLink = response.data.link
        }
      }
    })

    this.shopService.getKnoxData().then((response) => {
      this.knoxFlipCardLine1 = ''
      this.knoxFlipCardLine2 = ''
      this.knoxFlipCardLink = ''

      if (typeof response.data === 'object') {
        if (typeof response.data.line1 === 'string') {
          this.knoxFlipCardLine1 = response.data.line1
        }
        if (typeof response.data.line2 === 'string') {
          this.knoxFlipCardLine2 = response.data.line2
        }
        if (typeof response.data.link === 'string') {
          this.knoxFlipCardLink = response.data.link
        }
      }
    })
  }

  public async ionViewDidEnter() {
    this.isBalanceHidden = await this.storageService.get(WalletStorageKey.BALANCE_HIDDEN)
    this.doRefresh().catch(handleErrorSentry())
  }

  public async toggleBalanceVisibility() {
    this.isBalanceHidden = !this.isBalanceHidden
    await this.storageService.set(WalletStorageKey.BALANCE_HIDDEN, this.isBalanceHidden)
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
    this.operationsProvider.refreshAllDelegationStatuses(this.walletsProvider.getActiveWalletList())

    this.syncWarningNames = []
    this.total = 0
    this.isVisible = false

    const SYNC_TIMEOUT_MS = 10000
    const wallets = this.walletsProvider.getActiveWalletList().filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE)

    const cryptoToFiatPipe = new CryptoToFiatPipe(this.protocolService)
    const failedNames: Set<string> = new Set()

    await Promise.all(
      wallets.map(async (wallet) => {
        try {
          await promiseTimeout(SYNC_TIMEOUT_MS, wallet.synchronize())
        } catch (error) {
          handleErrorSentry(ErrorCategory.COINLIB)(error)
          failedNames.add(wallet.protocol.name)
        }

        try {
          if (wallet.getCurrentMarketPrice() === undefined || wallet.getCurrentMarketPrice()?.isNaN()) {
            await wallet.fetchCurrentMarketPrice()
          }

          const fiatValue = await cryptoToFiatPipe.transform(wallet.getCurrentBalance(), {
            protocolIdentifier: wallet.protocol.identifier,
            currentMarketPrice: wallet.getCurrentMarketPrice()
          })

          if (fiatValue !== '') {
            this.ngZone.run(() => {
              this.total = new BigNumber(this.total).plus(fiatValue).toNumber()
              this.isVisible = true
              this.syncWarningNames = [...failedNames]
              this.cdr.detectChanges()
            })
          } else {
            failedNames.add(wallet.protocol.name)
            this.ngZone.run(() => {
              this.isVisible = true
              this.syncWarningNames = [...failedNames]
              this.cdr.detectChanges()
            })
          }
        } catch {
          failedNames.add(wallet.protocol.name)
          this.ngZone.run(() => {
            this.isVisible = true
            this.syncWarningNames = [...failedNames]
            this.cdr.detectChanges()
          })
        }
      })
    )

    if (event?.target) {
      event.target.complete()
    }
  }

  public async calculateTotal(wallets: AirGapMarketWallet[], refresher: any = null): Promise<void> {
    const cryptoToFiatPipe = new CryptoToFiatPipe(this.protocolService)
    wallets = wallets.filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE)
    const failedNames: Set<string> = new Set()

    let runningTotal = new BigNumber(0)

    await Promise.all(
      wallets.map(async (wallet) => {
        try {
          if (wallet.getCurrentMarketPrice() === undefined || wallet.getCurrentMarketPrice()?.isNaN()) {
            await wallet.fetchCurrentMarketPrice()
          }

          const fiatValue = await cryptoToFiatPipe.transform(wallet.getCurrentBalance(), {
            protocolIdentifier: wallet.protocol.identifier,
            currentMarketPrice: wallet.getCurrentMarketPrice()
          })

          if (fiatValue !== '') {
            runningTotal = runningTotal.plus(fiatValue)
            this.ngZone.run(() => {
              this.total = runningTotal.toNumber()
              this.cdr.detectChanges()
            })
          } else {
            failedNames.add(wallet.protocol.name)
          }
        } catch {
          failedNames.add(wallet.protocol.name)
        }
      })
    )

    if (failedNames.size > 0) {
      const existing = new Set(this.syncWarningNames)
      failedNames.forEach((n) => existing.add(n))
      this.syncWarningNames = [...existing]
    }

    this.total = runningTotal.toNumber()

    if (refresher) {
      refresher.complete()
    }

    this.isVisible = true
  }

  public ngOnDestroy(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe()
    }
    this.subscriptions = []
  }

  public onClickLink(link: string) {
    if (link.length > 0) {
      window.open(link, '_blank')
    }
  }
}
