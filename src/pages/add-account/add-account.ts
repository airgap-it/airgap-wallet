import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { supportedProtocols, ICoinProtocol } from 'airgap-coin-lib'
import { AccountImportOnboardingPage } from '../account-import-onboarding/account-import-onboarding'
import { SubAccountImportPage } from '../sub-account-import/sub-account-import'
import { SupportedSubAccountsProvider } from '../../providers/supported-sub-accounts/supported-sub-accounts'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

@Component({
  selector: 'page-add-account',
  templateUrl: 'add-account.html'
})
export class AddAccountPage {
  searchTerm: string = ''
  supportedAccountProtocols: ICoinProtocol[] = []
  supportedSubAccountProtocols: ICoinProtocol[] = []
  filteredAccountProtocols: ICoinProtocol[] = []
  filteredSubAccountProtocols: ICoinProtocol[] = []

  constructor(public navCtrl: NavController, public navParams: NavParams, private supportedTokenProvider: SupportedSubAccountsProvider) {
    this.supportedAccountProtocols = supportedProtocols().map(coin => coin)
    this.supportedSubAccountProtocols = supportedProtocols().reduce((pv, cv) => {
      if (cv.subProtocols) {
        const subProtocols = cv.subProtocols.filter(subProtocol => subProtocol.subProtocolType === SubProtocolType.TOKEN)
        return pv.concat(...subProtocols)
      }
      return pv
    }, [])
    this.filterProtocols()
  }

  searchTermChanged() {
    this.filterProtocols()
  }

  filterProtocols() {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase()
    this.filteredAccountProtocols = this.supportedAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredSubAccountProtocols = this.supportedSubAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
  }

  addAccount(protocolIdentifier: string) {
    this.navCtrl.push(AccountImportOnboardingPage, { protocolIdentifier: protocolIdentifier })
  }

  addSubAccount(subProtocolIdentifier: string) {
    this.navCtrl.push(SubAccountImportPage, { subProtocolIdentifier: subProtocolIdentifier })
  }
}
