import { AmountConverterPipe, ProtocolService } from '@airgap/angular-core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { NetworkType } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { Component, Input } from '@angular/core'
import BigNumber from 'bignumber.js'
import { Observable, Subscription } from 'rxjs'

import { supportsDelegation } from '../../helpers/delegation'
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
  public showBalances: boolean = true

  @Input()
  public isExpendable: boolean = false

  @Input()
  public isExtended: boolean = false

  @Input()
  public hideFiatAmounts: boolean = false

  @Input()
  public hideDelegationBadge: boolean = false

  @Input()
  public isToken: boolean = false

  @Input()
  public isDelegated: Observable<boolean>

  @Input()
  public maxDigits: number

  public balance: BigNumber | undefined
  public balanceFormatted: string | undefined
  public marketPrice: BigNumber | undefined

  public numberOfDecimalsInBalance: number = 0
  public readonly smallFontDecimalThreshold = 16
  private readonly defaultMaxDigits = 15

  private walletChanged?: Subscription

  constructor(
    private readonly operationsProvider: OperationsProvider,
    public accountProvider: AccountProvider,
    private readonly protocolService: ProtocolService
  ) {}

  public ngOnInit(): void {
    this.initBalance()
    this.initMarketPrice()
    this.updateDelegationStatus()
    this.walletChanged = this.accountProvider.walletChangedObservable.subscribe(async () => {
      await this.updateBalance()
      this.updateMarketPrice()
      this.updateDelegationStatus()
    })
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

  private async initBalance() {
    if (this.wallet?.getCurrentBalance() === undefined) {
      await this.wallet?.balanceOf()
    }
    await this.updateBalance()
  }

  private async updateBalance() {
    if (!this.wallet) {
      return
    }

    await this.wallet.balanceOf()
    if (this.wallet.getCurrentBalance() !== undefined) {
      const converter = new AmountConverterPipe(this.protocolService)
      this.balance = this.wallet.getCurrentBalance()
      const balanceFormatted = await converter.transformValueOnly(this.balance, this.wallet.protocol, this.digits())
      this.balanceFormatted = `${balanceFormatted} ${this.wallet.protocol.symbol}`
      const balanceSplit = balanceFormatted.split('.')
      if (balanceSplit.length == 2) {
        const decimals = balanceSplit.pop()
        this.numberOfDecimalsInBalance = decimals.length
      }
    }
  }

  private async initMarketPrice() {
    if (this.wallet?.getCurrentMarketPrice() === undefined) {
      await this.wallet?.fetchCurrentMarketPrice()
    }
    this.updateMarketPrice()
  }

  private updateMarketPrice() {
    this.marketPrice = this.wallet?.getCurrentMarketPrice()
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
}
