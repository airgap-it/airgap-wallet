import { AmountConverterPipe, ClipboardService } from '@airgap/angular-core'
import { Component, NgZone } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController } from '@ionic/angular'
import {
  AirGapMarketWallet,
  EthereumProtocol,
  MainProtocolSymbols,
  SubProtocolSymbols,
  IACMessageType,
  TezosProtocol
} from 'airgap-coin-lib'
import { FeeDefaults } from 'airgap-coin-lib/dist/protocols/ICoinProtocol'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'
import { BigNumber } from 'bignumber.js'
import { BehaviorSubject } from 'rxjs'
import { debounceTime } from 'rxjs/operators'
import { AccountProvider } from 'src/app/services/account/account.provider'
import { PriceService } from 'src/app/services/price/price.service'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AddressValidator } from '../../validators/AddressValidator'
import { DecimalValidator } from '../../validators/DecimalValidator'

interface TransactionFormState<T> {
  value: T
  dirty: boolean
}
interface TransactionPrepareState {
  availableBalance: BigNumber | null
  forceMigration: boolean
  feeDefaults: FeeDefaults
  feeCurrentMarketPrice: number | null
  sendMaxAmount: boolean
  disableSendMaxAmount: boolean
  disableAdvancedMode: boolean
  disableFeeSlider: boolean
  disablePrepareButton: boolean

  estimatingMaxAmount: boolean
  estimatingFeeDefaults: boolean

  address: TransactionFormState<string>
  amount: TransactionFormState<string>
  feeLevel: TransactionFormState<number>
  fee: TransactionFormState<string>
  isAdvancedMode: TransactionFormState<boolean>
}

@Component({
  selector: 'page-transaction-prepare',
  templateUrl: 'transaction-prepare.html',
  styleUrls: ['./transaction-prepare.scss']
})
export class TransactionPreparePage {
  public readonly networkType: typeof NetworkType = NetworkType

  public wallet: AirGapMarketWallet
  public transactionForm: FormGroup
  public amountForm: FormGroup

  // temporary field until we figure out how to handle Substrate fee/tip model
  private readonly isSubstrate: boolean

  public state: TransactionPrepareState
  private _state: TransactionPrepareState
  private readonly state$: BehaviorSubject<TransactionPrepareState>

  private publicKey: string
  private protocolID: string
  private addressIndex
  private address: string
  private amount
  private forced

  constructor(
    public loadingCtrl: LoadingController,
    public formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly _ngZone: NgZone,
    private readonly clipboardProvider: ClipboardService,
    private readonly operationsProvider: OperationsProvider,
    private readonly dataService: DataService,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly priceService: PriceService,
    public readonly accountProvider: AccountProvider
  ) {
    this.publicKey = this.route.snapshot.params.publicKey
    this.protocolID = this.route.snapshot.params.protocolID
    this.addressIndex = this.route.snapshot.params.addressIndex
    this.addressIndex === 'undefined' ? (this.addressIndex = undefined) : (this.addressIndex = Number(this.addressIndex))

    this.state$ = new BehaviorSubject(this._state)

    this.address = this.route.snapshot.params.address
    this.amount = Number(this.route.snapshot.params.amount)
    this.forced = this.route.snapshot.params.forceMigration

    const address: string = this.address === 'false' ? '' : this.address || ''
    const amount: number = this.amount || 0
    const wallet: AirGapMarketWallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(
      this.publicKey,
      this.protocolID,
      this.addressIndex
    )
    const forceMigration: boolean = this.forced === 'forced' || false

    this.transactionForm = this.formBuilder.group({
      address: [address, Validators.compose([Validators.required, AddressValidator.validate(wallet.protocol)])],
      amount: [amount, Validators.compose([Validators.required, DecimalValidator.validate(wallet.protocol.decimals)])],
      feeLevel: [0, [Validators.required]],
      fee: [0, Validators.compose([Validators.required, DecimalValidator.validate(wallet.protocol.feeDecimals)])],
      isAdvancedMode: [false, []]
    })

    this.wallet = wallet

    this.isSubstrate =
      wallet.protocol.identifier === MainProtocolSymbols.KUSAMA || wallet.protocol.identifier === MainProtocolSymbols.POLKADOT

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

  public onChanges(): void {
    this.state$.pipe(debounceTime(200)).subscribe((state: TransactionPrepareState) => {
      this.onStateUpdated(state)
    })

    this.transactionForm
      .get('address')
      .valueChanges.pipe(debounceTime(500))
      .subscribe((value: string) => {
        this.updateState({
          address: {
            value,
            dirty: true
          },
          disableSendMaxAmount: false,
          disablePrepareButton: this.transactionForm.invalid || new BigNumber(this._state.amount.value).lte(0)
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
          amount: {
            value: amount.isNaN() ? '' : amount.toFixed(),
            dirty: true
          },
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
          fee: {
            value: fee.isNaN() ? '' : fee.toFixed(),
            dirty: true
          },
          disablePrepareButton: this.transactionForm.invalid || new BigNumber(this._state.amount.value).lte(0)
        })

        if (this._state.sendMaxAmount) {
          this.updateWithMaxAmount(fee.toString(10))
        }
      })

    this.transactionForm.get('feeLevel').valueChanges.subscribe((value: number) => {
      const fee = new BigNumber(this.getFeeFromLevel(value))
      this.updateState(
        {
          fee: {
            value: fee.toFixed(),
            dirty: false
          },
          feeLevel: {
            value,
            dirty: true
          },
          disablePrepareButton: this.transactionForm.invalid || new BigNumber(this._state.amount.value).lte(0)
        },
        false
      )

      if (this._state.sendMaxAmount) {
        this.updateWithMaxAmount(fee.toString(10))
      }
    })

    this.transactionForm.get('isAdvancedMode').valueChanges.subscribe((value: boolean) => {
      this.updateState(
        {
          isAdvancedMode: {
            value,
            dirty: true
          },
          disablePrepareButton: this.transactionForm.invalid || new BigNumber(this._state.amount.value).lte(0)
        },
        false
      )
    })
  }

  private async initState(): Promise<void> {
    this._state = {
      availableBalance: null,
      forceMigration: false,
      feeDefaults: this.wallet.protocol.feeDefaults,
      feeCurrentMarketPrice: null,
      sendMaxAmount: false,
      disableSendMaxAmount: true,
      disableAdvancedMode: this.isSubstrate,
      disableFeeSlider: true,
      disablePrepareButton: true,
      estimatingMaxAmount: false,
      estimatingFeeDefaults: false,
      address: {
        value: this.transactionForm.controls.address.value,
        dirty: false
      },
      amount: {
        value: this.transactionForm.controls.amount.value,
        dirty: false
      },
      feeLevel: {
        value: this.transactionForm.controls.feeLevel.value,
        dirty: false
      },
      fee: {
        value: this.transactionForm.controls.fee.value,
        dirty: false
      },
      isAdvancedMode: {
        value: this.transactionForm.controls.isAdvancedMode.value,
        dirty: false
      }
    }
    this.state = this._state

    const [feeCurrentMarketPrice, availableBalance]: [number, BigNumber] = await Promise.all([
      this.calculateFeeCurrentMarketPrice(this.wallet),
      this.getAvailableBalance(this.wallet)
    ])

    this.updateState({
      availableBalance,
      feeCurrentMarketPrice
    })
  }

  private updateState(newState: Partial<TransactionPrepareState>, debounce: boolean = true): void {
    this._state = this.reduceState(this._state, newState)

    if (debounce) {
      this.state$.next(this._state)
    } else {
      this.onStateUpdated(this._state)
    }
  }

  private reduceState(currentState: TransactionPrepareState, newState: Partial<TransactionPrepareState>): TransactionPrepareState {
    return {
      availableBalance: newState.availableBalance !== undefined ? newState.availableBalance : currentState.availableBalance,
      forceMigration: newState.forceMigration !== undefined ? newState.forceMigration : currentState.forceMigration,

      feeDefaults: newState.feeDefaults || currentState.feeDefaults,
      feeCurrentMarketPrice:
        newState.feeCurrentMarketPrice !== undefined ? newState.feeCurrentMarketPrice : currentState.feeCurrentMarketPrice,

      sendMaxAmount: newState.sendMaxAmount !== undefined ? newState.sendMaxAmount : currentState.sendMaxAmount,

      disableSendMaxAmount: newState.disableSendMaxAmount !== undefined ? newState.disableSendMaxAmount : currentState.disableSendMaxAmount,
      disableAdvancedMode:
        this.isSubstrate || (newState.disableAdvancedMode !== undefined ? newState.disableAdvancedMode : currentState.disableAdvancedMode),
      disableFeeSlider:
        this.isSubstrate || (newState.disableFeeSlider !== undefined ? newState.disableFeeSlider : currentState.disableFeeSlider),
      disablePrepareButton: newState.disablePrepareButton !== undefined ? newState.disablePrepareButton : currentState.disablePrepareButton,

      estimatingMaxAmount: newState.estimatingMaxAmount !== undefined ? newState.estimatingMaxAmount : currentState.estimatingMaxAmount,
      estimatingFeeDefaults:
        newState.estimatingFeeDefaults !== undefined ? newState.estimatingFeeDefaults : currentState.estimatingFeeDefaults,

      address: newState.address || currentState.address,
      amount: newState.amount || currentState.amount,
      feeLevel: newState.feeLevel || currentState.feeLevel,
      fee: newState.fee || currentState.fee,
      isAdvancedMode: newState.isAdvancedMode || currentState.isAdvancedMode
    }
  }

  private onStateUpdated(newState: TransactionPrepareState): void {
    this.state = newState

    this.updateTransactionForm({
      address: this.state.address,
      amount: this.state.amount,
      fee: this.state.fee,
      feeLevel: this.state.feeLevel,
      isAdvancedMode: this.state.isAdvancedMode
    })
  }

  private updateTransactionForm(formState: { [key: string]: TransactionFormState<any> }) {
    const formValues = this.transactionForm.value
    const updated = {}

    Object.keys(formValues).forEach((key: string) => {
      if (key in formState && !formState[key].dirty && formState[key].value !== formValues[key]) {
        updated[key] = formState[key].value
      }
    })

    this._ngZone.run(() => {
      this.transactionForm.patchValue(updated, { emitEvent: false })
      Object.keys(updated).forEach((key: string) => {
        this.transactionForm.controls[key].markAsDirty()
      })
    })
  }

  private async calculateFeeCurrentMarketPrice(wallet: AirGapMarketWallet): Promise<number> {
    if (wallet.protocol.identifier === SubProtocolSymbols.XTZ_BTC) {
      return this.priceService.getCurrentMarketPrice(new TezosProtocol(), 'USD').then((price: BigNumber) => price.toNumber())
    } else if (wallet.protocol.identifier.startsWith(SubProtocolSymbols.ETH_ERC20)) {
      return this.priceService.getCurrentMarketPrice(new EthereumProtocol(), 'USD').then((price: BigNumber) => price.toNumber())
    } else {
      return wallet.currentMarketPrice.toNumber()
    }
  }

  private async getAvailableBalance(wallet: AirGapMarketWallet): Promise<BigNumber> {
    // TODO: refactor this so that we do not need to check for the protocols
    if (
      wallet.protocol.identifier === MainProtocolSymbols.COSMOS ||
      wallet.protocol.identifier === MainProtocolSymbols.KUSAMA ||
      wallet.protocol.identifier === MainProtocolSymbols.POLKADOT
    ) {
      return new BigNumber(await wallet.protocol.getAvailableBalanceOfAddresses([wallet.addresses[0]]))
    } else {
      return wallet.currentBalance
    }
  }

  private async updateFeeEstimate(): Promise<void> {
    if (!this._state.isAdvancedMode.value) {
      this.updateState({
        estimatingFeeDefaults: true,
        disableFeeSlider: true,
        disablePrepareButton: true
      })

      const feeDefaults: FeeDefaults = await this.estimateFees().catch(() => undefined)
      const feeLevel: number = feeDefaults && !this.isSubstrate ? 1 : this._state.feeLevel.value

      this.updateState({
        estimatingFeeDefaults: false,
        feeDefaults,
        fee: {
          value: new BigNumber(this.getFeeFromLevel(feeLevel, feeDefaults)).toFixed(),
          dirty: false
        },
        feeLevel: {
          value: feeLevel,
          dirty: false
        },
        disableFeeSlider: !feeDefaults,
        disablePrepareButton: !feeDefaults || this.transactionForm.invalid || new BigNumber(this._state.amount.value).lte(0)
      })
    }
  }

  private async estimateFees(): Promise<FeeDefaults | undefined> {
    const amount = new BigNumber(this._state.amount.value).shiftedBy(this.wallet.protocol.decimals)

    const isAddressValid = this.transactionForm.controls.address.valid
    const isAmountValid = this.transactionForm.controls.amount.valid && !amount.isNaN() && amount.gt(0)

    return isAddressValid && isAmountValid
      ? this.operationsProvider.estimateFees(this.wallet, this._state.address.value, amount)
      : undefined
  }

  private getFeeFromLevel(feeLevel: number, feeDefaults?: FeeDefaults): string {
    const defaults = feeDefaults || this._state.feeDefaults
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
    const amount = new BigNumber(this._state.amount.value).shiftedBy(this.wallet.protocol.decimals)
    const fee = new BigNumber(this._state.fee.value).shiftedBy(this.wallet.protocol.feeDecimals)

    try {
      const { airGapTxs, unsignedTx } = await this.operationsProvider.prepareTransaction(
        this.wallet,
        this._state.address.value,
        amount,
        fee
      )

      const info = {
        wallet: this.wallet,
        airGapTxs,
        data: unsignedTx,
        type: IACMessageType.TransactionSignRequest
      }
      this.dataService.setData(DataServiceKey.INTERACTION, info)
      this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (error) {
      //
    }
  }

  public openScanner() {
    const callback = (address: string) => {
      this.updateState({
        address: {
          value: address,
          dirty: false
        }
      })
    }
    const info = {
      callback
    }
    this.dataService.setData(DataServiceKey.SCAN, info)
    this.router.navigateByUrl('/scan-address/' + DataServiceKey.SCAN).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async toggleMaxAmount(): Promise<void> {
    this.updateState(
      {
        sendMaxAmount: !this._state.sendMaxAmount
      },
      false
    )

    if (this._state.sendMaxAmount) {
      await this.updateWithMaxAmount()
      this.updateFeeEstimate()
    }
  }

  private async forceMigration(): Promise<void> {
    this.updateState(
      {
        forceMigration: true,
        sendMaxAmount: true,
        disablePrepareButton: false
      },
      false
    )
    await this.updateWithMaxAmount()
  }

  private async updateWithMaxAmount(formFee?: string): Promise<void> {
    this.updateState({
      estimatingMaxAmount: true
    })

    const fee = formFee ? new BigNumber(formFee).shiftedBy(this.wallet.protocol.feeDecimals) : undefined
    const maxAmount = await this.operationsProvider.estimateMaxTransferAmount(this.wallet, this._state.address.value, fee)

    const formAmount = this.amountConverterPipe.transformValueOnly(maxAmount, this.wallet.protocol, this.wallet.protocol.decimals + 1)

    if (!maxAmount.isNaN()) {
      this.updateState({
        estimatingMaxAmount: false,
        amount: {
          value: formAmount,
          dirty: false
        },
        disablePrepareButton: this.transactionForm.invalid || maxAmount.isNaN() || maxAmount.lte(0)
      })
    }
  }

  public pasteClipboard() {
    this.clipboardProvider.paste().then(
      (text: string) => {
        this.updateState({
          address: {
            value: text,
            dirty: false
          },
          disableSendMaxAmount: false,
          disablePrepareButton: this.transactionForm.invalid || new BigNumber(this._state.amount.value).lte(0)
        })
        this.updateFeeEstimate()
      },
      (err: string) => {
        console.error('Error: ' + err)
      }
    )
  }
}
