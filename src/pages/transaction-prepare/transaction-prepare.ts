import { Component, NgZone } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { BigNumber } from 'bignumber.js'
import { NavController, NavParams, ToastController, Platform, LoadingController } from 'ionic-angular'

import { Transaction } from '../../models/transaction.model'
import { ScanAddressPage } from '../scan-address/scan-address'
import { TransactionQrPage } from '../transaction-qr/transaction-qr'
import { Keyboard } from '@ionic-native/keyboard'
import { AirGapMarketWallet } from 'airgap-coin-lib'

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
      let rawUnsignedTx = await this.wallet.prepareTransaction([transactionInfo.address], [transactionInfo.amount], transactionInfo.fee)
      let transaction = new Transaction(
        [this.wallet.receivingPublicAddress],
        [transactionInfo.address],
        transactionInfo.amount,
        transactionInfo.fee,
        this.wallet.protocolIdentifier
      )

      let signQRData = {
        protocolIdentifier: this.wallet.protocolIdentifier,
        publicKey: this.wallet.publicKey,
        payload: rawUnsignedTx
      }

      let base64 = window.btoa(JSON.stringify(signQRData))

      this.navController.push(TransactionQrPage, {
        wallet: this.wallet,
        transaction: transaction,
        data: 'airgap-vault://sign?data=' + base64
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
