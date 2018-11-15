import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'
import { Transaction } from '../../models/transaction.model'
import { AirGapMarketWallet } from 'airgap-coin-lib'

declare let window

@Component({
  selector: 'page-transaction-qr',
  templateUrl: 'transaction-qr.html'
})
export class TransactionQrPage {
  public preparedDataQR: string = ''
  public wallet: AirGapMarketWallet = null
  public airGapTx: Transaction = null
  public isBrowser: boolean = false

  constructor(public navCtrl: NavController, public navParams: NavParams, private platform: Platform) {
    this.wallet = this.navParams.get('wallet')
    this.airGapTx = this.navParams.get('airGapTx')
    this.preparedDataQR = this.navParams.get('data')
    this.isBrowser = !this.platform.is('cordova')
  }

  done() {
    this.navCtrl.popToRoot()
  }

  sameDeviceSign() {
    let sApp
    if (this.platform.is('android')) {
      sApp = window.startApp.set({
        action: 'ACTION_VIEW',
        uri: this.preparedDataQR,
        flags: ['FLAG_ACTIVITY_NEW_TASK']
      })
    } else if (this.platform.is('ios')) {
      sApp = window.startApp.set(this.preparedDataQR)
    }
    sApp.start(
      () => {
        console.log('OK')
      },
      error => {
        alert('Oops. Something went wrong here. Do you have AirGap Vault installed on the same Device?')
        console.log('CANNOT OPEN VAULT', this.preparedDataQR, error)
      }
    )
  }
}
