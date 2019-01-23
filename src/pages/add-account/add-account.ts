import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { supportedProtocols, ICoinProtocol, getSubProtocolByIdentifier, addSubProtocol, GenericERC20 } from 'airgap-coin-lib'
import { AccountImportOnboardingPage } from '../account-import-onboarding/account-import-onboarding'
import { SubAccountImportPage } from '../sub-account-import/sub-account-import'
import { ICoinSubProtocol } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

@Component({
  selector: 'page-add-account',
  templateUrl: 'add-account.html'
})
export class AddAccountPage {
  supportedAccountProtocols: ICoinProtocol[] = []
  supportedSubAccountProtocols: ICoinProtocol[] = []

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.supportedAccountProtocols = supportedProtocols().map(coin => coin)
    addSubProtocol(
      'eth',
      new GenericERC20('AE-ERC20', 'æternity Ethereum Token', 'ae', 'eth-erc20-ae', '0x5ca9a71b1d01849c0a95490cc00559717fcf0d1d')
    )
    this.supportedSubAccountProtocols = supportedProtocols().reduce((pv, cv) => {
      return pv.concat(...getSubProtocolByIdentifier(cv.identifier))
    }, [])
    console.log('subProtocols', getSubProtocolByIdentifier('eth'))
  }

  addAccount(protocolIdentifier: string) {
    this.navCtrl.push(AccountImportOnboardingPage, { protocolIdentifier: protocolIdentifier })
  }

  addSubAccount(subProtocolIdentifier: string) {
    this.navCtrl.push(SubAccountImportPage, { subProtocolIdentifier: subProtocolIdentifier })
  }
}
