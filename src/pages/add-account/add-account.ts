import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { supportedProtocols, ICoinProtocol, getSubProtocolByIdentifier } from 'airgap-coin-lib'
import { AccountImportOnboardingPage } from '../account-import-onboarding/account-import-onboarding'
import { SubAccountImportPage } from '../sub-account-import/sub-account-import'
import { SupportedSubAccountsProvider } from '../../providers/supported-sub-accounts/supported-sub-accounts'

@Component({
  selector: 'page-add-account',
  templateUrl: 'add-account.html'
})
export class AddAccountPage {
  supportedAccountProtocols: ICoinProtocol[] = []
  supportedSubAccountProtocols: ICoinProtocol[] = []

  constructor(public navCtrl: NavController, public navParams: NavParams, private supportedTokenProvider: SupportedSubAccountsProvider) {
    this.supportedAccountProtocols = supportedProtocols().map(coin => coin)
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
