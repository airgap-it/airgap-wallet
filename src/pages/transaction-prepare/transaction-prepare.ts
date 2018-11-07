import { Component, NgZone } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { BigNumber } from 'bignumber.js'
import { NavController, NavParams, ToastController, LoadingController } from 'ionic-angular'

import { ScanAddressPage } from '../scan-address/scan-address'
import { TransactionQrPage } from '../transaction-qr/transaction-qr'
import { AirGapMarketWallet, SyncProtocolUtils, EncodedType } from 'airgap-coin-lib'

@Component({
  selector: 'page-transaction-prepare',
  templateUrl: 'transaction-prepare.html'
})
export class TransactionPreparePage {
  public wallet: AirGapMarketWallet
  public transactionForm: FormGroup

  // form values
  public address: string = ''
  public amount: number = 0
  public fee: string = '0'
  public feeLevel: number = 0

  constructor(
    public loadingCtrl: LoadingController,
    public formBuilder: FormBuilder,
    private toastController: ToastController,
    private navController: NavController,
    private navParams: NavParams,
    private _ngZone: NgZone
  ) {
    this.transactionForm = formBuilder.group({
      address: ['', [Validators.required]],
      amount: [0, [Validators.required]],
      feeLevel: [0, [Validators.required]],
      fee: ['0', [Validators.required]]
    })

    this.useWallet(this.navParams.get('wallet'))
  }

  useWallet(wallet: AirGapMarketWallet) {
    this.wallet = wallet

    // set fee per default to low
    this.fee = this.wallet.coinProtocol.feeDefaults.low.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)

    this.transactionForm.get('feeLevel').valueChanges.subscribe(val => {
      this._ngZone.run(() => {
        switch (val) {
          case 0:
            this.fee = this.wallet.coinProtocol.feeDefaults.low.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
            break
          case 1:
            this.fee = this.wallet.coinProtocol.feeDefaults.medium.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
            break
          case 2:
            this.fee = this.wallet.coinProtocol.feeDefaults.high.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
            break
          default:
            this.fee = this.wallet.coinProtocol.feeDefaults.medium.toFixed(-1 * this.wallet.coinProtocol.feeDefaults.low.e + 1)
            break
        }
      })
    })
  }

  public async prepareTransaction(transactionInfo: any) {
    transactionInfo.amount = new BigNumber(transactionInfo.amount).shiftedBy(this.wallet.coinProtocol.decimals)
    transactionInfo.fee = new BigNumber(transactionInfo.fee).shiftedBy(this.wallet.coinProtocol.feeDecimals)

    let loading = this.loadingCtrl.create({
      content: 'Preparing TX...'
    })

    await loading.present()

    try {
      // TODO: This is an UnsignedTransaction, not an IAirGapTransaction
      let rawUnsignedTx: any = await this.wallet.prepareTransaction(
        [transactionInfo.address],
        [transactionInfo.amount],
        transactionInfo.fee
      )

      const airGapTx = this.wallet.coinProtocol.getTransactionDetails({
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
          transaction: rawUnsignedTx
        }
      })

      this.navController.push(TransactionQrPage, {
        wallet: this.wallet,
        airGapTx: airGapTx,
        data: 'airgap-vault://?d=' + serializedTx
      })

      loading.dismiss()
    } catch (e) {
      console.warn(e)
      this.toastController
        .create({
          message: e,
          duration: 3000,
          position: 'bottom'
        })
        .present()
    } finally {
      loading.dismiss()
    }
  }

  public openScanner() {
    let callback = address => {
      this.transactionForm.controls.address.setValue(address)
    }
    this.navController.push(ScanAddressPage, {
      callback: callback
    })
  }
}
