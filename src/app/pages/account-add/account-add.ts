import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { ICoinProtocol, supportedProtocols } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ProtocolsProvider } from '../../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'page-account-add',
  templateUrl: 'account-add.html',
  styleUrls: ['./account-add.scss']
})
export class AccountAddPage {
  public searchTerm: string = ''
  public supportedAccountProtocols: ICoinProtocol[] = []
  public supportedSubAccountProtocols: ICoinProtocol[] = []
  public filteredAccountProtocols: ICoinProtocol[] = []
  public filteredSubAccountProtocols: ICoinProtocol[] = []

  constructor(
    private readonly accountProvider: AccountProvider,
    private readonly protocolsProvider: ProtocolsProvider,
    private readonly router: Router,
    private readonly dataService: DataService
  ) {
    this.supportedAccountProtocols = supportedProtocols().map(coin => coin)
    this.supportedSubAccountProtocols = supportedProtocols().reduce((pv, cv) => {
      if (cv.subProtocols) {
        const subProtocols = cv.subProtocols.filter(
          subProtocol =>
            subProtocol.subProtocolType === SubProtocolType.TOKEN &&
            this.protocolsProvider.getEnabledSubProtocols().indexOf(subProtocol.identifier) >= 0
        )

        return pv.concat(...subProtocols)
      }

      return pv
    }, [])
    this.filterProtocols()
  }

  public searchTermChanged() {
    this.filterProtocols()
  }

  public filterProtocols() {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase()
    this.filteredAccountProtocols = this.supportedAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredSubAccountProtocols = this.supportedSubAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
  }

  public addAccount(protocolIdentifier: string) {
    this.dataService.setData(DataServiceKey.PROTOCOL, protocolIdentifier)
    this.router.navigateByUrl('/account-import-onboarding/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public addSubAccount(subProtocolIdentifier: string) {
    const mainProtocolIdentifier = subProtocolIdentifier.split('-')[0]
    if (this.accountProvider.getWalletList().filter(protocol => protocol.protocolIdentifier === mainProtocolIdentifier).length > 0) {
      console.log(subProtocolIdentifier)
      const info = {
        subProtocolIdentifier
      }
      this.dataService.setData(DataServiceKey.PROTOCOL, info)
      this.router.navigateByUrl('/sub-account-import/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      console.log(mainProtocolIdentifier)
      this.dataService.setData(DataServiceKey.PROTOCOL, mainProtocolIdentifier)
      this.router.navigateByUrl('/account-import-onboarding/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }
}
