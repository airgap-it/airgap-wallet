import { InteractionSelectionPage } from '../interaction-selection/interaction-selection'
import { AddressValidator } from './../../validators/AddressValidator'
import { Component, NgZone } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { RegexValidator } from '../../validators/RegexValidator'
import { BigNumber } from 'bignumber.js'
import { NavController, NavParams, ToastController, LoadingController } from 'ionic-angular'
import { ScanAddressPage } from '../scan-address/scan-address'
import { AirGapMarketWallet, SyncProtocolUtils, EncodedType } from 'airgap-coin-lib'
import { HttpClient } from '@angular/common/http'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { ClipboardProvider } from '../../providers/clipboard/clipboard'

@Component({
  selector: 'page-transaction-prepare',
  templateUrl: 'transaction-prepare.html'
})
export class TransactionPreparePage {
  public wallet: AirGapMarketWallet
  public transactionForm: FormGroup
  public amountForm: FormGroup

  public sendMaxAmount = false

  constructor(
    public loadingCtrl: LoadingController,
    public formBuilder: FormBuilder,
    private toastController: ToastController,
    private navController: NavController,
    private navParams: NavParams,
    private _ngZone: NgZone,
    private http: HttpClient,
    private clipboardProvider: ClipboardProvider
  ) {
    const address = this.navParams.get('address') || ''
    this.transactionForm = formBuilder.group({
      address: [address, Validators.compose([Validators.required, AddressValidator.validate(this.navParams.get('wallet').coinProtocol)])],
      amount: [0, Validators.compose([Validators.required, RegexValidator.validate(/^[0-9]+((\.|,){1}[0-9]*)?$/g)])],
      feeLevel: [0, [Validators.required]],
      fee: [0, Validators.compose([Validators.required, RegexValidator.validate(/^[0-9]+((\.|,){1}[0-9]*)?$/g)])],
      isAdvancedMode: [false, []]
    })

    this.useWallet(this.navParams.get('wallet'))
    this.onChanges()
  }

  onChanges(): void {
    this.transactionForm.get('amount').valueChanges.subscribe(val => {
      this.sendMaxAmount = false
    })

    this.transactionForm.get('fee').valueChanges.subscribe(val => {
      if (this.sendMaxAmount) {
        this.setMaxAmount(val)
      }
    })
  }

  useWallet(wallet: AirGapMarketWallet) {
    this.wallet = wallet

    // set fee per default to low
    this.transactionForm.controls.fee.setValue(
      this.wallet.coinProtocol.feeDefaults.low.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
    )

    // TODO: Remove this code after we implement a fee system
    if (this.wallet.protocolIdentifier === 'ae') {
      this.http.get('https://api-airgap.gke.papers.tech/fees').subscribe((result: any) => {
        if (result && result.low && result.medium && result.high) {
          this.wallet.coinProtocol.feeDefaults.low = new BigNumber(result.low)
          this.wallet.coinProtocol.feeDefaults.medium = new BigNumber(result.medium)
          this.wallet.coinProtocol.feeDefaults.high = new BigNumber(result.high)
          this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.low.toFixed())
        }
        this.transactionForm.get('feeLevel').valueChanges.subscribe(val => {
          this._ngZone.run(() => {
            switch (val) {
              case 0:
                this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.low.toFixed())
                break
              case 1:
                this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.medium.toFixed())
                break
              case 2:
                this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.high.toFixed())
                break
              default:
                this.transactionForm.controls.fee.setValue(this.wallet.coinProtocol.feeDefaults.medium.toFixed())
                break
            }
          })
        })
      })
    } else {
      this.transactionForm.get('feeLevel').valueChanges.subscribe(val => {
        this._ngZone.run(() => {
          switch (val) {
            case 0:
              this.transactionForm.controls.fee.setValue(
                this.wallet.coinProtocol.feeDefaults.low.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
              )
              break
            case 1:
              this.transactionForm.controls.fee.setValue(
                this.wallet.coinProtocol.feeDefaults.medium.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
              )
              break
            case 2:
              this.transactionForm.controls.fee.setValue(
                this.wallet.coinProtocol.feeDefaults.high.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
              )
              break
            default:
              this.transactionForm.controls.fee.setValue(
                this.wallet.coinProtocol.feeDefaults.medium.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
              )
              break
          }
        })
      })
    }
  }

  public async prepareTransaction() {
    const { address: formAddress, amount: formAmount, fee: formFee } = this.transactionForm.value
    const amount = new BigNumber(formAmount).shiftedBy(this.wallet.coinProtocol.decimals)
    const fee = new BigNumber(formFee).shiftedBy(this.wallet.coinProtocol.feeDecimals)

    const loading = this.loadingCtrl.create({
      content: 'Preparing TX...'
    })

    await loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    try {
      // TODO: This is an UnsignedTransaction, not an IAirGapTransaction
      console.log('preparing wallet tx', this.wallet)
      const rawUnsignedTx: any = await this.wallet.prepareTransaction([formAddress], [amount], fee)

      const airGapTx = await this.wallet.coinProtocol.getTransactionDetails({
        publicKey: this.wallet.publicKey,
        transaction: rawUnsignedTx
      })

      const syncProtocol = new SyncProtocolUtils()
      const serializedTx = await syncProtocol.serialize({
        version: 1,
        protocol: this.wallet.coinProtocol.identifier,
        type: EncodedType.UNSIGNED_TRANSACTION,
        payload: {
          publicKey: this.wallet.publicKey,
          transaction: rawUnsignedTx,
          callback: 'airgap-wallet://?d='
        }
      })

      this.navController
        .push(InteractionSelectionPage, {
          wallet: this.wallet,
          airGapTx: airGapTx,
          data: 'airgap-vault://?d=' + serializedTx
        })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))

      loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } catch (e) {
      console.warn(e)
      this.toastController
        .create({
          message: e,
          duration: 3000,
          position: 'bottom'
        })
        .present()
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } finally {
      loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  public openScanner() {
    let callback = address => {
      this.transactionForm.controls.address.setValue(address)
    }
    this.navController
      .push(ScanAddressPage, {
        callback: callback
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public toggleMaxAmount() {
    this.sendMaxAmount = !this.sendMaxAmount
    if (this.sendMaxAmount) {
      this.setMaxAmount(this.transactionForm.value.fee)
    }
  }

  private setMaxAmount(fee: string) {
    // We need to pass the fee here because during the "valueChanges" call the form is not updated
    const amount = this.wallet.currentBalance.shiftedBy(-1 * this.wallet.coinProtocol.decimals)
    const amountWithoutFees = amount.minus(new BigNumber(fee))
    this.transactionForm.controls.amount.setValue(amountWithoutFees.toFixed(), { emitEvent: false })
  }

  public pasteClipboard() {
    this.clipboardProvider.paste().then(
      (text: string) => {
        this.transactionForm.controls.address.setValue(text)
      },
      (err: string) => {
        console.error('Error: ' + err)
      }
    )
  }
}
