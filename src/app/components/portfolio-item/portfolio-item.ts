import { AmountConverterPipe, ICoinProtocolAdapter, ProtocolService, getMainIdentifier } from '@airgap/angular-core'
import { AirGapMarketWallet, ICoinSubProtocol, SubProtocolSymbols } from '@airgap/coinlib-core'
import { NetworkType } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { Component, Input } from '@angular/core'
import BigNumber from '@airgap/coinlib-core/dependencies/src/bignumber.js-9.0.0/bignumber'
import { Observable, ReplaySubject, Subscription } from 'rxjs'
import { isMultisig } from '@airgap/module-kit'

import { isSubProtocol } from 'src/app/utils/utils'
import { supportsDelegation } from '../../helpers/delegation'
import { promiseTimeout } from '../../helpers/promise'

import { AccountProvider } from '../../services/account/account.provider'
import { OperationsProvider } from '../../services/operations/operations'

@Component({
  selector: 'portfolio-item',
  templateUrl: 'portfolio-item.html',
  styleUrls: ['./portfolio-item.scss']
})
export class PortfolioItemComponent {
  public readonly networkType: typeof NetworkType = NetworkType

  public isActive: boolean = false

  @Input()
  public wallet: AirGapMarketWallet

  @Input()
  public parentWalletName: string | undefined

  @Input()
  public showBalances: boolean = true

  @Input()
  public hideBalances: boolean = false

  @Input()
  public isExpendable: boolean = false

  @Input()
  public isExtended: boolean = false

  @Input()
  public hideFiatAmounts: boolean = false

  @Input()
  public hideDelegationBadge: boolean = false

  @Input()
  public hideMultisigBadge: boolean = false

  @Input()
  public isToken: boolean = false

  @Input()
  public isDelegated: Observable<boolean>

  @Input()
  public isMultisig: Observable<boolean>

  @Input()
  public maxDigits: number

  @Input()
  public isSimplified: boolean = false

  public balance: BigNumber | undefined
  public balanceFormatted: string | undefined
  public marketPrice: BigNumber | undefined
  public syncFailed: boolean = false

  public parentProtocol: ReplaySubject<ICoinSubProtocol> = new ReplaySubject(1)

  public numberOfDecimalsInBalance: number = 0
  public readonly smallFontDecimalThreshold = 16
  private readonly defaultMaxDigits = 15

  private static readonly SYNC_TIMEOUT_MS = 20000

  /** Address the delegation/multisig/parent statuses were last resolved for, `null` if never. */
  private statusesAddress: string | undefined | null = null

  private walletChanged?: Subscription
  private readonly amountConverter: AmountConverterPipe

  public constructor(
    private readonly operationsProvider: OperationsProvider,
    public accountProvider: AccountProvider,
    private readonly protocolService: ProtocolService
  ) {
    this.amountConverter = new AmountConverterPipe(this.protocolService)
  }

  public ngOnInit(): void {
    this.refresh().catch(() => undefined)
    this.walletChanged = this.accountProvider.walletChangedObservable.subscribe(() => {
      this.refresh().catch(() => undefined)
    })
  }

  /**
   * Reads the wallet's current balance and market price into the view. If the wallet
   * has not been synced yet, it joins the (deduplicated) `synchronize()` call that the
   * account provider or portfolio page already started. After a failed sync the item
   * shows a failed state and stops retrying until someone else refreshes the wallet.
   */
  private async refresh(): Promise<void> {
    if (!this.wallet) {
      return
    }

    // The statuses only depend on the wallet's address; the provider emits once per
    // synced wallet, so do not resolve them again on every emission.
    if (this.statusesAddress === null || this.statusesAddress !== this.wallet.receivingPublicAddress) {
      this.statusesAddress = this.wallet.receivingPublicAddress
      this.updateDelegationStatus()
      this.updateParentProtocol()
      this.updateMultisigStatus()
    }

    await this.readWalletState()

    if (this.wallet.getCurrentBalance() === undefined && !this.syncFailed) {
      try {
        // Some protocol clients never settle when their node is unreachable; do not
        // keep the skeleton forever in that case.
        await promiseTimeout(PortfolioItemComponent.SYNC_TIMEOUT_MS, this.wallet.synchronize())
      } catch {
        this.syncFailed = this.wallet.getCurrentBalance() === undefined
      }
      await this.readWalletState()
    }
  }

  private async updateDelegationStatus() {
    if (this.wallet !== undefined && this.wallet?.receivingPublicAddress !== undefined) {
      if (!supportsDelegation(this.wallet.protocol)) {
        this.isDelegated = null
      } else {
        this.isDelegated = await this.operationsProvider.getDelegationStatusObservable(this.wallet)
      }
    }
  }

  private async updateMultisigStatus() {
    if (this.wallet !== undefined && this.wallet?.receivingPublicAddress !== undefined) {
      const protocol = this.wallet.protocol as ICoinProtocolAdapter

      if (!isMultisig(protocol.protocolV1)) {
        this.isMultisig = null
      } else {
        this.isMultisig = await this.operationsProvider.getMultisigStatusObservable(this.wallet)
      }
    }
  }

  private async readWalletState(): Promise<void> {
    if (!this.wallet) {
      return
    }

    const balance: BigNumber | undefined = this.wallet.getCurrentBalance()
    const marketPrice: BigNumber | undefined = this.wallet.getCurrentMarketPrice()

    if (balance !== undefined) {
      this.syncFailed = false
      if (this.balance === undefined || !this.balance.isEqualTo(balance)) {
        this.balance = balance
        await this.formatBalance(balance)
      }
    }

    this.marketPrice = marketPrice !== undefined && !marketPrice.isNaN() ? marketPrice : undefined
  }

  private async formatBalance(balance: BigNumber): Promise<void> {
    this.balanceFormatted = await this.amountConverter.transformValueOnly(balance, this.wallet.protocol, this.digits())
    const balanceSplit = this.balanceFormatted.split('.')
    this.numberOfDecimalsInBalance = balanceSplit.length === 2 ? balanceSplit[1].length : 0
  }

  public digits(): number {
    if (this.maxDigits === undefined) {
      return Math.min(this.wallet.protocol.decimals + 1, this.defaultMaxDigits)
    } else {
      return this.maxDigits == 0 ? this.wallet.protocol.decimals + 1 : this.maxDigits
    }
  }

  public ngOnDestroy(): void {
    this.walletChanged?.unsubscribe()
  }

  private async updateParentProtocol(): Promise<void> {
    if (this.wallet === undefined) {
      return
    }
    const protocol = this.wallet.protocol
    let parent: ICoinSubProtocol | undefined = undefined
    if (isSubProtocol(protocol)) {
      const mainProdocolIdentifier = getMainIdentifier((await protocol.getIdentifier()) as SubProtocolSymbols)
      parent = await this.protocolService.getProtocol(mainProdocolIdentifier).catch(() => undefined)
    }
    this.parentProtocol.next(parent)
  }
}
