import { Component } from '@angular/core'
import { LoadingController, NavController, NavParams, ToastController, AlertController, Platform } from 'ionic-angular'

import { getProtocolByIdentifier, IAirGapTransaction, DeserializedSyncProtocol, SignedTransaction, ICoinProtocol } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'

declare var cordova: any

@Component({
  selector: 'page-transaction-confirm',
  templateUrl: 'transaction-confirm.html'
})
export class TransactionConfirmPage {
  public signedTx: string
  public airGapTx: IAirGapTransaction
  public protocol: ICoinProtocol

  constructor(
    public loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    public navController: NavController,
    public navParams: NavParams,
    private alertCtrl: AlertController,
    private platform: Platform
  ) {}

  dismiss() {
    this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  async ionViewWillEnter() {
    await this.platform.ready()
    const signedTransactionSync: DeserializedSyncProtocol = this.navParams.get('signedTransactionSync')
    // tslint:disable-next-line:no-unnecessary-type-assertion
    this.signedTx = (signedTransactionSync.payload as SignedTransaction).transaction
    this.protocol = getProtocolByIdentifier(signedTransactionSync.protocol)
    try {
      this.airGapTx = await this.protocol.getTransactionDetailsFromSigned(this.navParams.get('signedTransactionSync').payload)
    } catch (e) {
      handleErrorSentry(ErrorCategory.COINLIB)(e)
    }
  }

  broadcastTransaction() {
    let loading = this.loadingCtrl.create({
      content: 'Broadcasting...'
    })

    loading.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))

    let blockexplorer = '' // TODO: Move to coinlib
    if (this.protocol.identifier === 'btc') {
      blockexplorer = 'https://live.blockcypher.com/btc/tx/{{txId}}/'
    } else if (this.protocol.identifier === 'eth') {
      blockexplorer = 'https://etherscan.io/tx/{{txId}}'
    } else if (this.protocol.identifier === 'eth-erc20-ae') {
      blockexplorer = 'https://etherscan.io/tx/{{txId}}'
    } else if (this.protocol.identifier === 'ae') {
      blockexplorer = 'https://explorer.aepps.com/#/tx/{{txId}}'
    } else if (this.protocol.identifier === 'xtz') {
      blockexplorer = 'https://tzscan.io/{{txId}}'
    }

    let interval = setTimeout(() => {
      loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      let toast = this.toastCtrl.create({
        duration: 3000,
        message: 'Transaction queued. It might take some time until your TX shows up!',
        showCloseButton: true,
        position: 'bottom'
      })
      toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }, 20 * 1000)

    this.protocol
      .broadcastTransaction(this.signedTx)
      .then(txId => {
        if (interval) {
          clearInterval(interval)
        }
        loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        let alert = this.alertCtrl.create({
          title: 'Transaction broadcasted!',
          message: 'Your transaction has been successfully broadcasted',
          buttons: [
            {
              text: 'Open Blockexplorer',
              handler: () => {
                if (blockexplorer) {
                  this.openUrl(blockexplorer.replace('{{txId}}', txId))
                } else {
                  let toast = this.toastCtrl.create({
                    duration: 3000,
                    message: 'Unable to open blockexplorer',
                    showCloseButton: true,
                    position: 'bottom'
                  })
                  toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
                }
                this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
              }
            },
            {
              text: 'Ok',
              handler: () => {
                this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
              }
            }
          ]
        })
        alert.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
      .catch(e => {
        if (interval) {
          clearInterval(interval)
        }
        loading.dismiss().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        console.warn(e)
        let toast = this.toastCtrl.create({
          duration: 5000,
          message: 'Transaction broadcasting failed: ' + e,
          showCloseButton: true,
          position: 'bottom'
        })
        toast.present().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        this.navController.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
  }

  private openUrl(url: string) {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }
}
