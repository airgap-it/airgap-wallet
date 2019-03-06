import { Component } from '@angular/core'
import { IonicPage, NavController, NavParams } from 'ionic-angular'
import { TezosKtProtocol, AirGapMarketWallet } from 'airgap-coin-lib'
import { BakerInfo } from 'airgap-coin-lib/dist/protocols/tezos/kt/TezosKtProtocol'

/**
 * Generated class for the DelegationBakerDetailPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-delegation-baker-detail',
  templateUrl: 'delegation-baker-detail.html'
})
export class DelegationBakerDetailPage {
  public bakerAddress = 'tz1eEnQhbwf6trb8Q8mPb2RaPkNk2rN7BKi8'
  public bakerInfo: BakerInfo
  public wallet: AirGapMarketWallet

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.wallet = this.navParams.get('wallet')
  }

  async ionViewDidLoad() {
    const kt = new TezosKtProtocol()
    this.bakerInfo = await kt.bakerInfo(this.bakerAddress)
  }
}
