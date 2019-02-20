import { Component } from '@angular/core'
import { NavController, NavParams, Platform } from 'ionic-angular'
import { Transaction } from '../../models/transaction.model'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { DeepLinkProvider } from 'src/providers/deep-link/deep-link'

@Component({
  selector: 'page-transaction-qr',
  templateUrl: 'transaction-qr.html'
})
export class TransactionQrPage {
  public preparedDataQR: string = ''
  public wallet: AirGapMarketWallet = null
  public airGapTx: Transaction = null
  public isBrowser: boolean = false

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private platform: Platform,
    private deeplinkProvider: DeepLinkProvider
  ) {
    this.wallet = this.navParams.get('wallet')
    this.airGapTx = this.navParams.get('airGapTx')
    this.preparedDataQR = this.navParams.get('data')
    this.isBrowser = !this.platform.is('cordova')
  }

  done() {
    this.navCtrl.popToRoot().catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  sameDeviceSign() {
    this.deeplinkProvider.sameDeviceDeeplink(this.preparedDataQR)
  }
}
