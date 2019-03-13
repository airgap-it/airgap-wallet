import { ErrorCategory, handleErrorSentry } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { AccountProvider } from '../../providers/account/account.provider'
import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { TransactionPreparePage } from '../transaction-prepare/transaction-prepare'

@Component({
  selector: 'page-select-wallet',
  templateUrl: 'select-wallet.html'
})
export class SelectWalletPage {
  public compatibleWallets: AirGapMarketWallet[] = []
  public incompatibleWallets: AirGapMarketWallet[] = []

  private address: string

  constructor(public navCtrl: NavController, public navParams: NavParams, public accountProvider: AccountProvider) {}

  async ionViewWillLoad() {
    this.address = this.navParams.get('address')
    this.compatibleWallets = this.navParams.get('compatibleWallets')
    this.incompatibleWallets = this.navParams.get('incompatibleWallets')
  }

  openPreparePage(wallet: AirGapMarketWallet) {
    this.navCtrl
      .push(TransactionPreparePage, {
        wallet: wallet,
        address: this.address
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
