import { Component } from '@angular/core'
import { NavController, NavParams, ToastController } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Clipboard } from '@ionic-native/clipboard'

@Component({
  selector: 'page-account-address',
  templateUrl: 'account-address.html'
})
export class AccountAddressPage {
  public wallet: AirGapMarketWallet

  constructor(
    private navController: NavController,
    private navParams: NavParams,
    private clipboard: Clipboard,
    private toastController: ToastController
  ) {
    this.wallet = this.navParams.get('wallet')
  }

  async copyAddressToClipboard() {
    await this.clipboard.copy(this.wallet.receivingPublicAddress)
    let toast = this.toastController.create({
      message: 'Address was copied to your clipboard',
      duration: 2000,
      position: 'top',
      showCloseButton: true,
      closeButtonText: 'Ok'
    })
    await toast.present()
  }

  async done() {
    await this.navController.pop()
  }
}
