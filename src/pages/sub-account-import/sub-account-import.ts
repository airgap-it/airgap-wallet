import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AccountProvider } from '../../providers/account/account.provider'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Component({
  selector: 'page-sub-account-import',
  templateUrl: 'sub-account-import.html'
})
export class SubAccountImportPage {
  private mainAccounts: AirGapMarketWallet[]
  private subProtocolIdentifier: string

  constructor(public navCtrl: NavController, public navParams: NavParams, private accountProvider: AccountProvider) {
    this.subProtocolIdentifier = this.navParams.get('subProtocolIdentifier')
    this.mainAccounts = this.accountProvider.getWalletList().filter(protocol => protocol.protocolIdentifier === 'eth')
  }
}
