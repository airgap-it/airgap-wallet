import { Component } from '@angular/core'
import { LoadingController, NavController, NavParams, ToastController, ViewController, BlockerDelegate, AlertController, Platform } from 'ionic-angular'

import { Transaction } from '../../models/transaction.model'
import { QrProvider } from '../../providers/qr/qr'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

declare var cordova: any

@Component({
  selector: 'page-transaction-confirm',
  templateUrl: 'transaction-confirm.html'
})

export class TransactionConfirmPage {

  public transaction: Transaction

  constructor(
    private qrProvider: QrProvider,
    public loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    public navController: NavController,
    public navParams: NavParams,
    private alertCtrl: AlertController,
    private platform: Platform) { }

  dismiss() {
    this.navController.popToRoot()
  }

  ionViewWillEnter() {
    if (this.navParams.get('data')) {
      this.transaction = this.qrProvider.getBroadcastFromData(this.navParams.get('data'))
    } else if (this.navParams.get('transaction')) {
      this.transaction = this.navParams.get('transaction')
    }
  }

  broadcastTransaction() {
    let loading = this.loadingCtrl.create({
      content: 'Broadcasting...'
    })

    loading.present()

    let protocol = getProtocolByIdentifier(this.transaction.protocolIdentifier)
    let blockexplorer = '' // TODO: Move to coinlib
    if (this.transaction.protocolIdentifier === 'btc') {
      blockexplorer = 'https://live.blockcypher.com/btc/tx/{{txId}}/'
    } else if (this.transaction.protocolIdentifier === 'eth') {
      blockexplorer = 'https://etherscan.io/tx/{{txId}}'
    } else if (this.transaction.protocolIdentifier === 'eth-erc20-ae') {
      blockexplorer = 'https://etherscan.io/tx/{{txId}}'
    }

    let interval = setTimeout(() => {
      loading.dismiss()
      let toast = this.toastCtrl.create({
        duration: 3000,
        message: 'Transaction queued. It might take some time until your TX shows up!',
        showCloseButton: true,
        position: 'bottom'
      })
      toast.present()
      this.navController.popToRoot()
    }, 20 * 1000)

    protocol.broadcastTransaction(this.transaction.payload).then(txId => {
      if (interval) {
        clearInterval(interval)
      }
      loading.dismiss()
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
                toast.present()
              }
              this.navController.popToRoot()
            }
          },
          {
            text: 'Ok',
            handler: () => {
              this.navController.popToRoot()
            }
          }
        ]
      })
      alert.present()
    }).catch(e => {
      if (interval) {
        clearInterval(interval)
      }
      loading.dismiss()
      console.warn(e)
      let toast = this.toastCtrl.create({
        duration: 5000,
        message: 'Transaction broadcasting failed: ' + e,
        showCloseButton: true,
        position: 'bottom'
      })
      toast.present()
      this.navController.popToRoot()
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
