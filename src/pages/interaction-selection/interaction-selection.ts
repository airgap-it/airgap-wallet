import { TransactionQrPage } from '../transaction-qr/transaction-qr'
import { AirGapMarketWallet, IAirGapTransaction } from 'airgap-coin-lib'
import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { DeepLinkProvider } from '../../providers/deep-link/deep-link'

@Component({
  selector: 'page-interaction-selection',
  templateUrl: 'interaction-selection.html'
})
export class InteractionSelectionPage {
  public preparedDataQR: string = ''
  private wallet: AirGapMarketWallet
  private airGapTx: IAirGapTransaction

  constructor(public navController: NavController, public navParams: NavParams, private deepLinkProvider: DeepLinkProvider) {}

  async ionViewDidEnter() {
    this.wallet = await this.navParams.get('wallet')
    this.airGapTx = await this.navParams.get('airGapTx')
    this.preparedDataQR = await this.navParams.get('data')
  }

  offlineDeviceSign() {
    this.navController
      .push(TransactionQrPage, {
        wallet: this.wallet,
        airGapTx: this.airGapTx,
        data: this.preparedDataQR
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  sameDeviceSign() {
    this.deepLinkProvider.sameDeviceDeeplink(this.preparedDataQR)
  }
}
