import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'
import { supportedProtocols, ICoinProtocol } from 'airgap-coin-lib'
import { AccountImportOnboardingPage } from '../account-import-onboarding/account-import-onboarding'
import { SubAccountImportPage } from '../sub-account-import/sub-account-import'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { handleErrorSentry, ErrorCategory } from '../../providers/sentry-error-handler/sentry-error-handler'
import { AccountProvider } from '../../providers/account/account.provider'

@Component({
  selector: 'page-account-add',
  templateUrl: 'account-add.html'
})
export class AccountAddPage {
  searchTerm: string = ''
  supportedAccountProtocols: ICoinProtocol[] = []
  supportedSubAccountProtocols: ICoinProtocol[] = []
  filteredAccountProtocols: ICoinProtocol[] = []
  filteredSubAccountProtocols: ICoinProtocol[] = []

  constructor(public navCtrl: NavController, public navParams: NavParams, private accountProvider: AccountProvider) {
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
    this.navCtrl
      .push(AccountImportOnboardingPage, { protocolIdentifier: protocolIdentifier })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  addSubAccount(subProtocolIdentifier: string) {
    const mainProtocolIdentifier = subProtocolIdentifier.split('-')[0]
    if (this.accountProvider.getWalletList().filter(protocol => protocol.protocolIdentifier === mainProtocolIdentifier).length > 0) {
      this.navCtrl
        .push(SubAccountImportPage, { subProtocolIdentifier: subProtocolIdentifier })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      this.navCtrl
        .push(AccountImportOnboardingPage, { protocolIdentifier: mainProtocolIdentifier })
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }
}
