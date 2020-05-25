import { Component, NgZone } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController } from '@ionic/angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { BigNumber } from 'bignumber.js'

import { ClipboardService } from '../../services/clipboard/clipboard'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AddressValidator } from '../../validators/AddressValidator'
import { DecimalValidator } from '../../validators/DecimalValidator'
import { BehaviorSubject } from 'rxjs'
import { debounceTime } from 'rxjs/operators'
import { ProtocolSymbols } from 'src/app/services/protocols/protocols'
import { FeeDefaults } from 'airgap-coin-lib/dist/protocols/ICoinProtocol'

interface TransactionPrepareState {
  availableBalance: BigNumber
  forceMigration: boolean
  feeDefaults: FeeDefaults
  feeCurrentMarketPrice: number
  sendMaxAmount: boolean
  disableSendMaxAmount: boolean
  disableAdvancedMode: boolean
  disableFeeSlider: boolean
  disablePrepareButton: boolean
  estimatingFeeDefaults: boolean

  address: string
  addressDirty: boolean
  amount: number
  feeLevel: number
  fee: number
  isAdvancedMode: boolean
}

@Component({
  selector: 'page-transaction-prepare',
  templateUrl: 'transaction-prepare.html',
  styleUrls: ['./transaction-prepare.scss']
})
export class TransactionPreparePage {
  private readonly state$: BehaviorSubject<TransactionPrepareState> = new BehaviorSubject(undefined)
  public get state(): Partial<TransactionPrepareState> {
    return this.state$.value || {}
  }

  public wallet: AirGapMarketWallet
  public transactionForm: FormGroup
  public amountForm: FormGroup

  // temporary field until we figure out how to handle Substrate fee/tip model
  private readonly isSubstrate: boolean

  constructor(
    public loadingCtrl: LoadingController,
    public formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly _ngZone: NgZone,
    private readonly clipboardProvider: ClipboardService,
    private readonly operationsProvider: OperationsProvider,
    private readonly dataService: DataService
  ) {
    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      const address: string = info.address || ''
      const amount: number = info.amount || 0
      const wallet: AirGapMarketWallet = info.wallet
      const forceMigration: boolean = info.forceMigration || false

      this.transactionForm = this.formBuilder.group({
        address: [address, Validators.compose([Validators.required, AddressValidator.validate(wallet.coinProtocol)])],
        amount: [amount, Validators.compose([Validators.required, DecimalValidator.validate(wallet.coinProtocol.decimals)])],
        feeLevel: [0, [Validators.required]],
        fee: [0, Validators.compose([Validators.required, DecimalValidator.validate(wallet.coinProtocol.feeDecimals)])],
        isAdvancedMode: [false, []]
      })

      this.wallet = wallet

      this.isSubstrate =
        wallet.coinProtocol.identifier === ProtocolSymbols.KUSAMA || wallet.coinProtocol.identifier === ProtocolSymbols.POLKADOT

      this.initState()
        .then(async () => {
          if (forceMigration) {
            await this.forceMigration()
          }
          this.onChanges()
          this.updateFeeEstimate()
        })
        .catch(handleErrorSentry(ErrorCategory.OTHER))
    }
  }

  public onChanges(): void {
    this.state$.subscribe((state: TransactionPrepareState) => {
      this.onStateUpdated(state)
    })

    this.transactionForm
      .get('address')
      .valueChanges.pipe(debounceTime(500))
      .subscribe((value: string) => {
        this.updateState({
          address: value,
          addressDirty: false,
          disableSendMaxAmount: false,
          disablePrepareButton: this.transactionForm.invalid || this.state.amount <= 0
        })
        this.updateFeeEstimate()
      })

    this.transactionForm
      .get('amount')
      .valueChanges.pipe(debounceTime(500))
      .subscribe((value: string) => {
        const amount = new BigNumber(value)
        this.updateState({
          sendMaxAmount: false,
          amount: amount.isNaN() ? 0 : amount.toNumber(),
          disablePrepareButton: this.transactionForm.invalid || amount.isNaN() || amount.lte(0)
        })
        this.updateFeeEstimate()
      })

    this.transactionForm
      .get('fee')
      .valueChanges.pipe(debounceTime(500))
      .subscribe((value: string) => {
        const fee = new BigNumber(value)
        this.updateState({
          fee: fee.isNaN() ? 0 : fee.toNumber(),
          disablePrepareButton: this.transactionForm.invalid || this.state.amount <= 0
        })

        if (this.state.sendMaxAmount) {
          this.updateWithMaxAmount(fee.toString(10))
        }
      })

    this.transactionForm.get('feeLevel').valueChanges.subscribe((value: number) => {
      const fee = new BigNumber(this.getFeeFromLevel(value))
      this.updateState({
        fee: fee.toNumber(),
        feeLevel: value,
        disablePrepareButton: this.transactionForm.invalid || this.state.amount <= 0
      })

      if (this.state.sendMaxAmount) {
        this.updateWithMaxAmount(fee.toString(10))
      }
    })

    this.transactionForm.get('isAdvancedMode').valueChanges.subscribe((value: boolean) => {
      this.updateState({
        isAdvancedMode: value,
        disablePrepareButton: this.transactionForm.invalid || this.state.amount <= 0
      })
    })
  }

  private async initState(): Promise<void> {
    const [feeCurrentMarketPrice, availableBalance]: [number, BigNumber] = await Promise.all([
      this.calculateFeeCurrentMarketPrice(this.wallet),
      this.getAvailableBalance(this.wallet)
    ])

    this.state$.next({
      availableBalance,
      forceMigration: false,
      feeDefaults: this.wallet.coinProtocol.feeDefaults,
      feeCurrentMarketPrice,
      sendMaxAmount: false,
      disableSendMaxAmount: true,
      disableAdvancedMode: this.isSubstrate,
      disableFeeSlider: true,
      disablePrepareButton: true,
      estimatingFeeDefaults: false,
      address: this.transactionForm.controls.address.value,
      addressDirty: false,
      amount: this.transactionForm.controls.amount.value,
      feeLevel: this.transactionForm.controls.feeLevel.value,
      fee: this.transactionForm.controls.fee.value,
      isAdvancedMode: this.transactionForm.controls.isAdvancedMode.value
    })
  }

  private updateState(newState: Partial<TransactionPrepareState>): void {
    const updated: TransactionPrepareState = {
      availableBalance: newState.availableBalance || this.state.availableBalance,
      forceMigration: newState.forceMigration !== undefined ? newState.forceMigration : this.state.forceMigration,

      feeDefaults: newState.feeDefaults || this.state.feeDefaults,
      feeCurrentMarketPrice:
        newState.feeCurrentMarketPrice !== undefined ? newState.feeCurrentMarketPrice : this.state.feeCurrentMarketPrice,

      sendMaxAmount: newState.sendMaxAmount !== undefined ? newState.sendMaxAmount : this.state.sendMaxAmount,

      disableSendMaxAmount: newState.disableSendMaxAmount !== undefined ? newState.disableSendMaxAmount : this.state.disableSendMaxAmount,
      disableAdvancedMode:
        this.isSubstrate || (newState.disableAdvancedMode !== undefined ? newState.disableAdvancedMode : this.state.disableAdvancedMode),
      disableFeeSlider:
        this.isSubstrate || (newState.disableFeeSlider !== undefined ? newState.disableFeeSlider : this.state.disableFeeSlider),
      disablePrepareButton: newState.disablePrepareButton !== undefined ? newState.disablePrepareButton : this.state.disablePrepareButton,

      estimatingFeeDefaults:
        newState.estimatingFeeDefaults !== undefined ? newState.estimatingFeeDefaults : this.state.estimatingFeeDefaults,

      address: newState.address !== undefined ? newState.address : this.state.address,
      addressDirty: newState.addressDirty !== undefined ? newState.addressDirty : this.state.addressDirty,
      amount: newState.amount !== undefined ? newState.amount : this.state.amount,
      feeLevel: newState.fee !== undefined ? newState.feeLevel : this.state.feeLevel,
      fee: newState.fee !== undefined ? newState.fee : this.state.fee,
      isAdvancedMode: newState.isAdvancedMode !== undefined ? newState.isAdvancedMode : this.state.isAdvancedMode
    }

    this.state$.next(updated)
  }

  private onStateUpdated(newState: TransactionPrepareState): void {
    const formValues: {
      address: string
      amount: number
      feeLevel: number
      fee: number
      isAdvanceMode: boolean
    } = this.transactionForm.value

    function getDifferences<T, K extends Extract<keyof T, keyof TransactionPrepareState>>(
      target: T,
      state: TransactionPrepareState,
      ...properties: K[]
    ): Partial<T> {
      const targetProperties: K[] = properties.length > 0 ? properties : (Object.keys(target).filter((key: string) => key in state) as K[])

      const differences: [K, T[K]][] = targetProperties
        .filter((property: K) => {
          const targetValue: T[K] = target[property]
          const stateValue: TransactionPrepareState[K] = state[property]

          return typeof targetValue === typeof stateValue && (targetValue as any) !== (stateValue as any)
        })
        .map((property: K) => [property, state[property] as unknown] as [K, T[K]])

      const differencesObject: Partial<T> = {}
      differences.forEach(([name, value]: [K, T[K]]) => {
        differencesObject[name] = value
      })

      return differencesObject
    }

    const formDifferences = getDifferences(formValues, newState)
    this._ngZone.run(() => {
      this.transactionForm.patchValue(formDifferences, { emitEvent: false })
      if (newState.addressDirty) {
        this.transactionForm.controls.address.markAsDirty()
      }
    })
  }

  private async calculateFeeCurrentMarketPrice(wallet: AirGapMarketWallet): Promise<number> {
    if (wallet.protocolIdentifier === ProtocolSymbols.TZBTC) {
      const newWallet = new AirGapMarketWallet(
        'xtz',
        'cdbc0c3449784bd53907c3c7a06060cf12087e492a7b937f044c6a73b522a234',
        false,
        'm/44h/1729h/0h/0h'
      )
      await newWallet.synchronize()
      return newWallet.currentMarketPrice.toNumber()
    } else {
      return wallet.currentMarketPrice.toNumber()
    }
  }

  private async getAvailableBalance(wallet: AirGapMarketWallet): Promise<BigNumber> {
    // TODO: refactor this so that we do not need to check for the protocols
    if (
      wallet.protocolIdentifier === ProtocolSymbols.COSMOS ||
      wallet.protocolIdentifier === ProtocolSymbols.KUSAMA ||
      wallet.protocolIdentifier === ProtocolSymbols.POLKADOT
    ) {
      return new BigNumber(await wallet.coinProtocol.getAvailableBalanceOfAddresses([wallet.addresses[0]]))
    } else {
      return wallet.currentBalance
    }
  }

  private async updateFeeEstimate(): Promise<void> {
    if (!this.state.isAdvancedMode) {
      this.updateState({
        estimatingFeeDefaults: true,
        disableFeeSlider: true,
        disablePrepareButton: true
      })

      const feeDefaults: FeeDefaults = await this.estimateFees().catch(() => undefined)
      const feeLevel: number = feeDefaults && !this.isSubstrate ? 1 : this.state.feeLevel

      this.updateState({
        estimatingFeeDefaults: false,
        feeDefaults,
        fee: new BigNumber(this.getFeeFromLevel(feeLevel, feeDefaults)).toNumber(),
        feeLevel,
        disableFeeSlider: !feeDefaults,
        disablePrepareButton: !feeDefaults || this.transactionForm.invalid || this.state.amount <= 0
      })
    }
  }

  private async estimateFees(): Promise<FeeDefaults | undefined> {
    const amount = new BigNumber(this.state.amount).shiftedBy(this.wallet.coinProtocol.decimals)

    const isAddressValid = this.transactionForm.controls.address.valid
    const isAmountValid = this.transactionForm.controls.amount.valid && !amount.isNaN() && amount.gt(0)

    return isAddressValid && isAmountValid ? this.operationsProvider.estimateFees(this.wallet, this.state.address, amount) : undefined
  }

  private getFeeFromLevel(feeLevel: number, feeDefaults?: FeeDefaults): string {
    const defaults = feeDefaults || this.state.feeDefaults
    switch (feeLevel) {
      case 0:
        return defaults.low
      case 1:
        return defaults.medium
      case 2:
        return defaults.high
      default:
        return defaults.medium
    }
  }

  public async prepareTransaction() {
    const amount = new BigNumber(this.state.amount).shiftedBy(this.wallet.coinProtocol.decimals)
    const fee = new BigNumber(this.state.fee).shiftedBy(this.wallet.coinProtocol.feeDecimals)

    try {
      const { airGapTxs, serializedTxChunks } = await this.operationsProvider.prepareTransaction(
        this.wallet,
        this.state.address,
        amount,
        fee
      )
      const info = {
        wallet: this.wallet,
        airGapTxs,
        data: serializedTxChunks
      }
      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      //
    }
  }

  public openScanner() {
    const callback = (address: string) => {
      this.updateState({ address })
    }
    const info = {
      callback
    }
    this.dataService.setData(DataServiceKey.SCAN, info)
    this.router.navigateByUrl('/scan-address/' + DataServiceKey.SCAN).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async toggleMaxAmount(): Promise<void> {
    this.updateState({
      sendMaxAmount: !this.state.sendMaxAmount
    })

    if (this.state.sendMaxAmount) {
      await this.updateWithMaxAmount()
      this.updateFeeEstimate()
    }
  }

  private async forceMigration(): Promise<void> {
    this.updateState({
      forceMigration: true,
      sendMaxAmount: true
    })
    await this.updateWithMaxAmount()
  }

  private async updateWithMaxAmount(formFee?: string): Promise<void> {
    const fee = formFee ? new BigNumber(formFee).shiftedBy(this.wallet.coinProtocol.feeDecimals) : undefined
    const maxAmount = await this.operationsProvider.estimateMaxTransferAmount(this.wallet, this.state.address, fee)

    const formAmount = maxAmount.shiftedBy(-this.wallet.coinProtocol.decimals).decimalPlaces(this.wallet.coinProtocol.decimals)

    if (!maxAmount.isNaN()) {
      this.updateState({
        amount: formAmount.toNumber(),
        disablePrepareButton: this.transactionForm.invalid || formAmount.isNaN() || formAmount.lte(0)
      })
    }
  }

  public pasteClipboard() {
    this.clipboardProvider.paste().then(
      (text: string) => {
        this.updateState({
          address: text,
          addressDirty: true,
          disableSendMaxAmount: false,
          disablePrepareButton: this.transactionForm.invalid || this.state.amount <= 0
        })
        this.updateFeeEstimate()
      },
      (err: string) => {
        console.error('Error: ' + err)
      }
    )
  }
}
