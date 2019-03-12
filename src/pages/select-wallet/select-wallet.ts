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

  ionViewDidLoad() {
    this.address = this.navParams.get('address')
    this.compatibleWallets = this.accountProvider.getCompatibleWallets()
    this.incompatibleWallets = this.accountProvider.getIncompatibleWallets()
  }

  openPreparePage(wallet: AirGapMarketWallet) {
    this.navCtrl
      .push(TransactionPreparePage, {
        wallet: wallet,
        address: this.address
      })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  ionViewWillLeave() {
    this.accountProvider.clearWalletSelection()
  }
}
