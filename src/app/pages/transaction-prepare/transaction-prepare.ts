import { HttpClient } from '@angular/common/http'
import { Component, NgZone } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingController } from '@ionic/angular'
import { AirGapMarketWallet, TezosKtProtocol, PolkadotProtocol } from 'airgap-coin-lib'
import { BigNumber } from 'bignumber.js'

import { ClipboardService } from '../../services/clipboard/clipboard'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { OperationsProvider } from '../../services/operations/operations'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AddressValidator } from '../../validators/AddressValidator'
import { DecimalValidator } from '../../validators/DecimalValidator'
import { BehaviorSubject } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

@Component({
  selector: 'page-transaction-prepare',
  templateUrl: 'transaction-prepare.html',
  styleUrls: ['./transaction-prepare.scss']
})
export class TransactionPreparePage {
  public wallet: AirGapMarketWallet
  public transactionForm: FormGroup
  public amountForm: FormGroup

  public sendMaxAmount = false
  public forceMigration = false

  // temporary fields until we figure out how to handle Polkadot fee/tip model
  public isPolkadot = false
  public polkadotFee: BigNumber = new BigNumber(NaN)
  private polkadotFee$: BehaviorSubject<string> = new BehaviorSubject('')

  constructor(
    public loadingCtrl: LoadingController,
    public formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly _ngZone: NgZone,
    private readonly http: HttpClient,
    private readonly clipboardProvider: ClipboardService,
    private readonly operationsProvider: OperationsProvider,
    private readonly dataService: DataService
  ) {
    let address = ''
    let wallet
    let amount = 0

    if (this.route.snapshot.data.special) {
      const info = this.route.snapshot.data.special
      address = info.address || ''
      amount = info.amount || 0
      wallet = info.wallet
      this.setWallet(wallet)

      this.transactionForm = formBuilder.group({
        address: [address, Validators.compose([Validators.required, AddressValidator.validate(wallet.coinProtocol)])],
        amount: [amount, Validators.compose([Validators.required, DecimalValidator.validate(wallet.coinProtocol.decimals)])],
        feeLevel: [0, [Validators.required]],
        fee: [0, Validators.compose([Validators.required, DecimalValidator.validate(wallet.coinProtocol.feeDecimals)])],
        isAdvancedMode: [false, []]
      })

      if (info.forceMigration) {
        this.forceMigration = info.forceMigration
        this.setMaxAmount('0')
      }
    }

    this.isPolkadot = this.wallet.coinProtocol.identifier === 'polkadot'

    this.useWallet()

    this.onChanges()
  }

  public onChanges(): void {
    this.transactionForm.get('amount').valueChanges.subscribe(() => {
      this.sendMaxAmount = false
      if (this.isPolkadot) {
        this.calculatePolkadotFee()
      }
    })

    this.transactionForm.get('fee').valueChanges.subscribe((val: string) => {
      if (this.sendMaxAmount) {
        this.setMaxAmount(val)
      }
    })

    // TODO: remove it when we properly support Polkadot fee/tip model
    if (this.isPolkadot) {
      this.polkadotFee$
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(value => {
          this.polkadotFee = new BigNumber(value).shiftedBy(-this.wallet.coinProtocol.feeDecimals)
          this.transactionForm.controls.fee.setValue(
            this.polkadotFee.toFixed(-1 * new BigNumber(this.wallet.coinProtocol.feeDefaults.low).e + 1)
          )
        })
      this.calculatePolkadotFee()
    }
  }
  public setWallet(wallet: AirGapMarketWallet) {
    this.wallet = wallet
  }

  public useWallet() {
    // set fee per default to low
    this.transactionForm.controls.fee.setValue(
      new BigNumber(this.wallet.coinProtocol.feeDefaults.low).toFixed(-1 * new BigNumber(this.wallet.coinProtocol.feeDefaults.low).e + 1)
    )
    // TODO: Remove this code after we implement a fee system
    if (this.wallet.protocolIdentifier === 'ae') {
      this.http.get('https://api-airgap.gke.papers.tech/fees').subscribe((result: any) => {
        if (result && result.low && result.medium && result.high) {
          this.wallet.coinProtocol.feeDefaults.low = new BigNumber(result.low).toString(10)
          this.wallet.coinProtocol.feeDefaults.medium = new BigNumber(result.medium).toString(10)
          this.wallet.coinProtocol.feeDefaults.high = new BigNumber(result.high).toString(10)
          this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.low)
        }
        this.transactionForm.get('feeLevel').valueChanges.subscribe(val => {
          this._ngZone.run(() => {
            switch (val) {
              case 0:
                this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.low)
                break
              case 1:
                this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.medium)
                break
              case 2:
                this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.high)
                break
              default:
                this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.medium)
            }
          })
        })
      })
    } else if (this.wallet.protocolIdentifier === 'xtz-kt' && this.forceMigration) {
      if (this.forceMigration) {
        this._ngZone.run(() => {
          const protocol: TezosKtProtocol = this.wallet.coinProtocol as TezosKtProtocol
          this.transactionForm.controls.fee.setValue(
            protocol.migrationFee
              .shiftedBy(-protocol.feeDecimals)
              .toFixed(-1 * new BigNumber(this.wallet.coinProtocol.feeDefaults.low).e + 1)
          )
        })
      }
    } else {
      this.transactionForm.get('feeLevel').valueChanges.subscribe(val => {
        this._ngZone.run(() => {
          switch (val) {
            case 0:
              this.transactionForm.controls.fee.setValue(
                new BigNumber(this.wallet.coinProtocol.feeDefaults.low).toFixed(
                  -1 * new BigNumber(this.wallet.coinProtocol.feeDefaults.low).e + 1
                )
              )
              break
            case 1:
              this.transactionForm.controls.fee.setValue(
                new BigNumber(this.wallet.coinProtocol.feeDefaults.medium).toFixed(
                  -1 * new BigNumber(this.wallet.coinProtocol.feeDefaults.low).e + 1
                )
              )
              break
            case 2:
              this.transactionForm.controls.fee.setValue(
                new BigNumber(this.wallet.coinProtocol.feeDefaults.medium).toFixed(
                  -1 * new BigNumber(this.wallet.coinProtocol.feeDefaults.low).e + 1
                )
              )
              break
            default:
              this.transactionForm.controls.fee.setValue(
                new BigNumber(this.wallet.coinProtocol.feeDefaults.medium).toFixed(
                  -1 * new BigNumber(this.wallet.coinProtocol.feeDefaults.low).e + 1
                )
              )
          }
        })
      })
    }
  }

  public async calculatePolkadotFee() {
    const { address: formAddress, amount: formAmount } = this.transactionForm.value
    const amount = new BigNumber(formAmount).shiftedBy(this.wallet.coinProtocol.decimals)

    if (this.isPolkadot && !amount.isNaN() && amount.isInteger()) {
      const fee = await (this.wallet.coinProtocol as PolkadotProtocol).getTransferFeeEstimate(
        this.wallet.publicKey,
        formAddress,
        amount.toString(10)
      )

      this.polkadotFee$.next(fee)
    }
  }

  public async prepareTransaction() {
    const { address: formAddress, amount: formAmount, fee: formFee } = this.transactionForm.value
    const amount = new BigNumber(formAmount).shiftedBy(this.wallet.coinProtocol.decimals)
    const fee = new BigNumber(formFee).shiftedBy(this.wallet.coinProtocol.feeDecimals)

    try {
      const { airGapTxs, serializedTxChunks } = await this.operationsProvider.prepareTransaction(this.wallet, formAddress, amount, fee)
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
    const callback = address => {
      this.transactionForm.controls.address.setValue(address)
    }
    const info = {
      callback
    }
    this.dataService.setData(DataServiceKey.SCAN, info)
    this.router.navigateByUrl('/scan-address/' + DataServiceKey.SCAN).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public toggleMaxAmount() {
    this.sendMaxAmount = !this.sendMaxAmount
    if (this.sendMaxAmount) {
      this.setMaxAmount(this.transactionForm.value.fee)
    }
  }

  private async setMaxAmount(formFee: string) {
    // We need to pass the fee here because during the "valueChanges" call the form is not updated
    const fee = new BigNumber(formFee).shiftedBy(this.wallet.coinProtocol.feeDecimals)
    const amount = await this.wallet.getMaxTransferValue(fee.toFixed())
    this.transactionForm.controls.amount.setValue(amount.shiftedBy(-this.wallet.coinProtocol.decimals).toFixed(), {
      emitEvent: false
    })
  }

  public pasteClipboard() {
    this.clipboardProvider.paste().then(
      (text: string) => {
        this.transactionForm.controls.address.setValue(text)
        this.transactionForm.controls.address.markAsDirty()
      },
      (err: string) => {
        console.error('Error: ' + err)
      }
    )
  }
}
