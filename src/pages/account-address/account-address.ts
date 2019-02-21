import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { ClipboardProvider } from '../../providers/clipboard/clipboard'

@Component({
  selector: 'page-account-address',
  templateUrl: 'account-address.html'
})
export class AccountAddressPage {
  public wallet: AirGapMarketWallet

  constructor(private navController: NavController, private navParams: NavParams, private clipboardProvider: ClipboardProvider) {
    this.wallet = this.navParams.get('wallet')
  }

  async copyAddressToClipboard() {
    await this.clipboardProvider.copyAndShowToast(this.wallet.receivingPublicAddress)
  }

  async done() {
    await this.navController.pop()
  }
}
