import { Component } from '@angular/core'
import { NavController, NavParams, ToastController } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Clipboard } from '@ionic-native/clipboard'

@Component({
  selector: 'page-wallet-address',
  templateUrl: 'wallet-address.html'
})
export class WalletAddressPage {
  public wallet: AirGapMarketWallet

  constructor(
    private navController: NavController,
    private navParams: NavParams,
    private clipboard: Clipboard,
    private toastController: ToastController
  ) {
    this.wallet = this.navParams.get('wallet')
  }

  async copy() {
    await this.clipboard.copy(this.wallet.receivingPublicAddress)
    let toast = this.toastController.create({
      message: 'Address was copied to your clipboard',
      duration: 3000
    })
    await toast.present()
  }

  async done() {
    await this.navController.pop()
  }
}
