import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { ICoinProtocol, supportedProtocols } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ProtocolsProvider } from '../../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { Platform } from '@ionic/angular'
import { LedgerService } from 'src/app/services/ledger/ledger-service'
import { AccountImportInteractionType } from '../account-import-interaction-selection/account-import-interaction-selection'

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
    private readonly platform: Platform,
    private readonly accountProvider: AccountProvider,
    private readonly protocolsProvider: ProtocolsProvider,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly ledgerService: LedgerService
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
    const isLedgerImportAvailable = this.ledgerService.getSupportedProtocols().includes(protocolIdentifier) && this.platform.is('desktop')
    if (!isLedgerImportAvailable) {
      this.importFromVault(protocolIdentifier)
    } else {
      this.showImportInteractionSelection(protocolIdentifier)
    }
  }

  public addSubAccount(subProtocolIdentifier: string) {
    const mainProtocolIdentifier = subProtocolIdentifier.split('-')[0]
    if (this.accountProvider.getWalletList().filter(protocol => protocol.protocolIdentifier === mainProtocolIdentifier).length > 0) {
      const info = {
        subProtocolIdentifier
      }
      this.dataService.setData(DataServiceKey.PROTOCOL, info)
      this.router.navigateByUrl('/sub-account-import/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      const info = {
        mainProtocolIdentifier: mainProtocolIdentifier,
        subProtocolIdentifier: subProtocolIdentifier
      }
      this.dataService.setData(DataServiceKey.PROTOCOL, info)
      this.router.navigateByUrl('/account-import-onboarding/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private showImportInteractionSelection(protocolIdentifier: string) {
    const info = {
      callback: (interactionType: AccountImportInteractionType) => {
        switch (interactionType) {
          case AccountImportInteractionType.VAULT:
            this.importFromVault(protocolIdentifier)
            break
          case AccountImportInteractionType.LEDGER:
            this.importFromLedger(protocolIdentifier)
            break
          default:
            console.log('Unkonw import interaction type selected.')
        }
      }
    }

    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router
      .navigateByUrl(`/account-import-interaction-selection/${DataServiceKey.INTERACTION}`, { skipLocationChange: true })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async importFromLedger(protocolIdentifier: string): Promise<void> {
    const info = {
      protocolIdentifier
    }
    this.dataService.setData(DataServiceKey.PROTOCOL, info)
    this.router
      .navigateByUrl('/account-import-ledger-onboarding/' + DataServiceKey.PROTOCOL)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private importFromVault(protocolIdentifier: string) {
    const info = {
      mainProtocolIdentifier: protocolIdentifier
    }
    this.dataService.setData(DataServiceKey.PROTOCOL, info)
    this.router.navigateByUrl('/account-import-onboarding/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
