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
          disableSendMaxAmount: false
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
          disablePrepareButton: amount.isNaN() || amount.lte(0)
        })
        this.updateFeeEstimate()
      })

    this.transactionForm
      .get('fee')
      .valueChanges.pipe(debounceTime(500))
      .subscribe((value: string) => {
        const fee = new BigNumber(value)
        this.updateState({
          fee: fee.isNaN() ? 0 : fee.toNumber()
        })
      })

    this.transactionForm.get('feeLevel').valueChanges.subscribe((value: number) => {
      this.updateState({
        feeLevel: value
      })
    })

    this.transactionForm.get('isAdvancedMode').valueChanges.subscribe((value: boolean) => {
      this.updateState({
        isAdvancedMode: value
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
    const newFeeLevel: number = this.isSubstrate ? 0 : newState.feeLevel
    const feeDefaults: FeeDefaults = newState.feeDefaults || this.state.feeDefaults
    const feeDefaultsWithLevel: { [level: number]: string } = {
      0: feeDefaults.low,
      1: feeDefaults.medium,
      2: feeDefaults.high
    }

    let fee: string | number
    if (newFeeLevel !== undefined) {
      fee = feeDefaultsWithLevel[newState.feeLevel]
    } else if (newState.fee !== undefined) {
      fee = newState.fee
    } else {
      fee = feeDefaultsWithLevel[this.state.feeLevel]
    }

    const disableAdvancedMode: boolean =
      this.isSubstrate || (newState.disableAdvancedMode !== undefined ? newState.disableAdvancedMode : this.state.disableAdvancedMode)

    const disableFeeSlider: boolean =
      this.isSubstrate || (newState.disableFeeSlider !== undefined ? newState.disableFeeSlider : this.state.disableFeeSlider)

    const disablePrepareButton: boolean =
      this.transactionForm.invalid ||
      (newState.disablePrepareButton !== undefined ? newState.disablePrepareButton : this.state.disablePrepareButton)

    const updated: TransactionPrepareState = {
      ...this.state$.value,
      ...newState,
      sendMaxAmount: newState.sendMaxAmount !== undefined ? newState.sendMaxAmount : this.state.sendMaxAmount,
      feeDefaults,
      fee: new BigNumber(fee).toNumber(),
      feeLevel: newFeeLevel !== undefined ? newFeeLevel : this.state.feeLevel,
      amount: newState.amount !== undefined ? newState.amount : this.state.amount,
      disableAdvancedMode,
      disableFeeSlider,
      disablePrepareButton
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

      this.updateState({
        estimatingFeeDefaults: false,
        feeDefaults,
        feeLevel: feeDefaults ? 1 : this.state.feeLevel,
        disableFeeSlider: !feeDefaults,
        disablePrepareButton: !feeDefaults || this.state.amount <= 0
      })
    }
  }

  private async estimateFees(): Promise<FeeDefaults | undefined> {
    const amount = new BigNumber(this.state.amount).shiftedBy(this.wallet.coinProtocol.decimals)

    const isAddressValid = this.transactionForm.controls.address.valid
    const isAmountValid = this.transactionForm.controls.amount.valid && !amount.isNaN() && amount.gt(0)

    return isAddressValid && isAmountValid ? this.operationsProvider.estimateFees(this.wallet, this.state.address, amount) : undefined
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
      const maxAmount = await this.getMaxAmount()
      this.updateState({
        amount: maxAmount
      })
      this.updateFeeEstimate()
    }
  }

  private async forceMigration(): Promise<void> {
    this.updateState({ sendMaxAmount: true })

    const maxAmount = await this.getMaxAmount()

    this.updateState({
      forceMigration: true,
      amount: maxAmount
    })
  }

  private async getMaxAmount(formFee?: number | string): Promise<number> {
    let fee: BigNumber
    if (formFee !== undefined) {
      fee = new BigNumber(formFee)
    } else {
      const feeEstimate = await this.wallet.estimateFees([this.state.address], [this.state.availableBalance.toFixed()])
      fee = new BigNumber(feeEstimate.high)
    }

    const amount = await this.wallet.getMaxTransferValue(fee.shiftedBy(this.wallet.coinProtocol.feeDecimals).toFixed())

    return new BigNumber(amount)
      .shiftedBy(-this.wallet.coinProtocol.decimals)
      .decimalPlaces(this.wallet.coinProtocol.decimals)
      .toNumber()
  }

  public pasteClipboard() {
    this.clipboardProvider.paste().then(
      (text: string) => {
        this.updateState({
          address: text,
          addressDirty: true,
          disableSendMaxAmount: false,
          disablePrepareButton: this.state.amount <= 0
        })
        this.updateFeeEstimate()
      },
      (err: string) => {
        console.error('Error: ' + err)
      }
    )
  }
}
