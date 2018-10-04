import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Component({
  selector: 'page-wallet-address',
  templateUrl: 'wallet-address.html'
})
export class WalletAddressPage {
  public wallet: AirGapMarketWallet

  constructor(private navController: NavController, private navParams: NavParams) {
    this.wallet = this.navParams.get('wallet')
  }

  done() {
    this.navController.pop()
  }
}
