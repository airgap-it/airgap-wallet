import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { AccountProvider } from '../../providers/account/account.provider'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { SubAccountProvider } from '../../providers/account/sub-account.provider'

@Component({
  selector: 'page-sub-account-import',
  templateUrl: 'sub-account-import.html'
})
export class SubAccountImportPage {
  private mainAccounts: AirGapMarketWallet[]
  private subProtocolIdentifier: string
  public subWallets: AirGapMarketWallet[]

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private accountProvider: AccountProvider,
    private subAccountProvier: SubAccountProvider
  ) {
    this.subWallets = []
    this.subProtocolIdentifier = this.navParams.get('subProtocolIdentifier')

    // TODO: Use observable
    this.mainAccounts = this.accountProvider.getWalletList().filter(protocol => protocol.protocolIdentifier === 'eth')
    this.mainAccounts.forEach(mainAccount => {
      const airGapMarketWallet: AirGapMarketWallet = new AirGapMarketWallet(
        this.subProtocolIdentifier,
        mainAccount.publicKey,
        mainAccount.isExtendedPublicKey,
        mainAccount.derivationPath
      )
      airGapMarketWallet.addresses = mainAccount.addresses
      airGapMarketWallet.synchronize()
      this.subWallets.push(airGapMarketWallet)
    })
  }

  importWallets() {
    this.subWallets.forEach(subWallet => {
      this.subAccountProvier.addWallet(subWallet)
    })
  }
}
