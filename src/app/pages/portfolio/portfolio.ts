import { Component } from '@angular/core'
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
  public isSyncing: boolean = false
  public isTotalIncomplete: boolean = false
  public syncWarningNames: string[] = []

  /** Entering the page re-syncs only wallets that were not synced within this window. */
  private static readonly AUTO_REFRESH_INTERVAL_MS = 60000
  private static readonly SYNC_TIMEOUT_MS = 10000

  public total: number = 0
  public changePercentage: number = 0

  public wallets: Observable<AirGapMarketWallet[]>
  public activeWallets: Observable<AirGapMarketWallet[]>
  public isDesktop: boolean = false

  /** Groups currently in the DOM. Grows in chunks, see `renderGroups`. */
  public visibleGroups: MainWalletGroup[] = []
  /** `undefined` until the first groups arrive, so the skeleton is shown until then. */
  public hasGroups: boolean | undefined = undefined

  /** Number of groups added to the DOM per frame. */
  private static readonly RENDER_CHUNK_SIZE = 12

  private allGroups: MainWalletGroup[] = []
  private renderHandle: number | undefined

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
    private readonly storageService: WalletStorageService
  ) {
    this.isDesktop = !this.platform.is('hybrid')

    this.wallets = this.walletsProvider.wallets$.asObservable()
    this.activeWallets = this.wallets.pipe(map((wallets) => wallets.filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE) ?? []))
    const groupSub = this.walletsProvider.walletsGroupedByMainWallet$.subscribe((groups: MainWalletGroup[]) => {
      this.renderGroups(groups)
    })
    this.subscriptions.push(groupSub)

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
    this.doRefresh(null, PortfolioPage.AUTO_REFRESH_INTERVAL_MS).catch(handleErrorSentry())
  }

  public async toggleBalanceVisibility() {
    this.isBalanceHidden = !this.isBalanceHidden
    await this.storageService.set(WalletStorageKey.BALANCE_HIDDEN, this.isBalanceHidden)
  }

  /**
   * Renders the wallet groups in chunks instead of all at once. Creating a few
   * hundred portfolio items in a single change detection pass blocks the main
   * thread for over a second; one chunk per frame keeps the page responsive and
   * shows the first accounts immediately.
   */
  private renderGroups(groups: MainWalletGroup[]): void {
    this.cancelProgressiveRender()

    this.allGroups = groups
    this.hasGroups = groups.length > 0

    const initialCount = Math.max(this.visibleGroups.length, PortfolioPage.RENDER_CHUNK_SIZE)
    this.visibleGroups = groups.slice(0, initialCount)

    this.scheduleNextChunk()
  }

  private scheduleNextChunk(): void {
    if (this.visibleGroups.length >= this.allGroups.length) {
      this.renderHandle = undefined
      return
    }

    this.renderHandle = requestAnimationFrame(() => {
      this.renderHandle = undefined
      this.visibleGroups = this.allGroups.slice(0, this.visibleGroups.length + PortfolioPage.RENDER_CHUNK_SIZE)
      this.scheduleNextChunk()
    })
  }

  private cancelProgressiveRender(): void {
    if (this.renderHandle !== undefined) {
      cancelAnimationFrame(this.renderHandle)
      this.renderHandle = undefined
    }
  }

  public trackByGroup(_index: number, group: MainWalletGroup): string {
    return group.mainWallet ? `${group.mainWallet.protocol.identifier}:${group.mainWallet.publicKey}` : `${_index}`
  }

  public trackByWallet(_index: number, wallet: AirGapMarketWallet): string {
    return `${wallet.protocol.identifier}:${wallet.publicKey}:${wallet.addressIndex ?? ''}`
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

  /**
   * Re-syncs the active wallets. Pull-to-refresh (`maxAgeMs = 0`) syncs every
   * wallet; entering the page passes an age so wallets synced a moment ago (for
   * example by the account provider on startup) are not fetched again.
   */
  public async doRefresh(event: any = null, maxAgeMs: number = 0) {
    const now = Date.now()
    const activeWallets = this.walletsProvider.getActiveWalletList().filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE)
    const wallets = activeWallets.filter((wallet) => {
      const lastAttempt = this.walletsProvider.getLastSyncAttempt(wallet)
      return lastAttempt === undefined || now - lastAttempt >= maxAgeMs
    })

    if (wallets.length === 0) {
      await this.calculateTotal(activeWallets)
      if (event?.target) {
        event.target.complete()
      }
      return
    }

    this.operationsProvider.refreshAllDelegationStatuses(wallets)

    const failedNames: Set<string> = new Set()

    this.isSyncing = true

    await Promise.all(
      wallets.map(async (wallet) => {
        try {
          await promiseTimeout(PortfolioPage.SYNC_TIMEOUT_MS, this.walletsProvider.synchronizeWallet(wallet))
        } catch (error) {
          handleErrorSentry(ErrorCategory.COINLIB)(error)
          failedNames.add(wallet.protocol.name)
        }
        // Let the portfolio items pick up this wallet's new state as it arrives
        // (emissions are coalesced by the provider).
        this.walletsProvider.triggerWalletChanged()
      })
    )

    this.isSyncing = false
    this.syncWarningNames = [...failedNames]
    await this.calculateTotal(activeWallets)

    if (event?.target) {
      event.target.complete()
    }
  }

  /**
   * Sums the fiat value of all wallets from their already loaded state. Never
   * triggers network requests; syncing is owned by the account provider and
   * `doRefresh`.
   */
  public async calculateTotal(wallets: AirGapMarketWallet[]): Promise<void> {
    const cryptoToFiatPipe = new CryptoToFiatPipe(this.protocolService)
    wallets = wallets.filter((wallet) => wallet.status === AirGapWalletStatus.ACTIVE)

    let runningTotal = new BigNumber(0)
    let incomplete = false
    let loadedCount = 0

    await Promise.all(
      wallets.map(async (wallet) => {
        const balance = wallet.getCurrentBalance()
        const marketPrice = wallet.getCurrentMarketPrice()
        if (balance === undefined || marketPrice === undefined || marketPrice.isNaN()) {
          incomplete = true
          return
        }

        const fiatValue = await cryptoToFiatPipe.transform(balance, {
          protocolIdentifier: wallet.protocol.identifier,
          currentMarketPrice: marketPrice
        })

        if (fiatValue !== '') {
          runningTotal = runningTotal.plus(fiatValue)
          loadedCount++
        } else {
          incomplete = true
        }
      })
    )

    this.total = runningTotal.toNumber()
    this.isTotalIncomplete = incomplete
    // Show the total once something has loaded; keep the skeleton only while
    // nothing has arrived yet and a sync is still running.
    this.isVisible = this.isVisible || loadedCount > 0 || wallets.length === 0 || !this.isSyncing
  }

  public ngOnDestroy(): void {
    this.cancelProgressiveRender()
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
