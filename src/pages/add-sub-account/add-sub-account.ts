import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { TezosKtProtocol, AirGapMarketWallet } from 'airgap-coin-lib'
import { SubAccountProvider } from '../../providers/account/sub-account.provider'

enum SubAccountType {
  TOKEN = 'token',
  ACCOUNT = 'account'
}

@Component({
  selector: 'page-add-sub-account',
  templateUrl: 'add-sub-account.html'
})
export class AddSubAccountPage {
  private subAccountType: SubAccountType
  private wallet: AirGapMarketWallet
  public subAccounts: { selected: boolean; wallet: AirGapMarketWallet }[] = []

  constructor(public navCtrl: NavController, public navParams: NavParams, private subAccountProvider: SubAccountProvider) {
    this.wallet = this.navParams.get('wallet')

    // TODO: Make generic
    if (this.wallet.protocolIdentifier === 'xtz') {
      this.subAccountType = SubAccountType.ACCOUNT

      const protocol = new TezosKtProtocol()
      protocol
        .getAddressesFromPublicKey(this.wallet.publicKey)
        .then(res => {
          res.forEach((_value, index) => {
            const wallet = new AirGapMarketWallet(
              'xtz-kt',
              this.wallet.publicKey,
              this.wallet.isExtendedPublicKey,
              this.wallet.derivationPath,
              index
            )
            wallet.addresses = res
            wallet.synchronize()
            this.subAccounts.push({ selected: false, wallet: wallet })
          })
        })
        .catch(console.error)
    } else {
      this.subAccountType = SubAccountType.TOKEN
      this.wallet.coinProtocol.subProtocols.forEach(protocol => {
        const wallet = new AirGapMarketWallet(
          protocol.identifier,
          this.wallet.publicKey,
          this.wallet.isExtendedPublicKey,
          this.wallet.derivationPath
        )
        wallet.addresses = this.wallet.addresses
        wallet.synchronize()
        this.subAccounts.push({ selected: false, wallet: wallet })
      })
    }
  }

  addSubAccounts() {
    console.log(this.subAccounts.filter(account => account.selected).map(account => account.wallet))
    this.subAccounts
      .filter(account => account.selected)
      .map(account => account.wallet)
      .forEach(wallet => {
        this.subAccountProvider.addWallet(wallet)
      })
    this.navCtrl.popToRoot()
  }
}
