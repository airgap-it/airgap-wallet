import { ProtocolService } from '@airgap/angular-core'
import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { ICoinProtocol } from 'airgap-coin-lib'
import { MainProtocolSymbols, SubProtocolSymbols } from 'airgap-coin-lib'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { LedgerService } from '../../services/ledger/ledger-service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AccountImportInteractionType } from '../account-import-interaction-selection/account-import-interaction-selection'

@Component({
  selector: 'page-account-add',
  templateUrl: 'account-add.html',
  styleUrls: ['./account-add.scss']
})
export class AccountAddPage {
  public searchTerm: string = ''
  public supportedAccountProtocols: ICoinProtocol[] = []
  public featuredSubAccountProtocols: ICoinProtocol[] = []
  public otherSubAccountProtocols: ICoinProtocol[] = []
  public filteredAccountProtocols: ICoinProtocol[] = []
  public filteredFeaturedSubAccountProtocols: ICoinProtocol[] = []
  public filteredOtherSubAccountProtocols: ICoinProtocol[] = []

  private featuredSubProtocols: SubProtocolSymbols[] = [
    SubProtocolSymbols.XTZ_KT,
    SubProtocolSymbols.XTZ_BTC,
    SubProtocolSymbols.XTZ_USD,
    SubProtocolSymbols.XTZ_STKR,
    SubProtocolSymbols.ETH_ERC20_XCHF
  ]

  constructor(
    private readonly platform: Platform,
    private readonly accountProvider: AccountProvider,
    private readonly protocolService: ProtocolService,
    private readonly router: Router,
    private readonly ledgerService: LedgerService,
    private readonly dataService: DataService
  ) {}

  public async ionViewWillEnter() {
    this.supportedAccountProtocols = (await this.protocolService.getActiveProtocols()).filter(
      protocol => protocol.options.network.type === NetworkType.MAINNET
    )
    const supportedSubAccountProtocols = Array.prototype.concat.apply(
      [],
      await Promise.all(Object.values(MainProtocolSymbols).map(protocol => this.protocolService.getSubProtocols(protocol)))
    )

    this.featuredSubAccountProtocols = supportedSubAccountProtocols.filter(
      protocol =>
        this.featuredSubProtocols.includes(protocol.identifier.toLowerCase()) && protocol.options.network.type === NetworkType.MAINNET
    )

    this.otherSubAccountProtocols = supportedSubAccountProtocols.filter(
      protocol =>
        !this.featuredSubProtocols.includes(protocol.identifier.toLowerCase()) &&
        protocol.options.network.type === NetworkType.MAINNET &&
        protocol.identifier !== SubProtocolSymbols.XTZ_KT
    )
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
    this.filteredFeaturedSubAccountProtocols = this.featuredSubAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredOtherSubAccountProtocols = this.otherSubAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
  }

  public addAccount(protocol: ICoinProtocol) {
    const isLedgerImportAvailable = this.ledgerService.isProtocolSupported(protocol) && this.platform.is('desktop')
    if (!isLedgerImportAvailable) {
      this.importFromVault(protocol)
    } else {
      this.showImportInteractionSelection(protocol)
    }
  }

  public addSubAccount(subProtocol: ICoinProtocol) {
    const mainProtocolIdentifier = subProtocol.identifier.split('-')[0]
    if (
      this.accountProvider
        .getWalletList()
        .filter(
          wallet =>
            wallet.protocol.identifier === mainProtocolIdentifier &&
            wallet.protocol.options.network.identifier === subProtocol.options.network.identifier
        ).length > 0
    ) {
      this.router
        .navigateByUrl(`/sub-account-import/${DataServiceKey.PROTOCOL}/${subProtocol.identifier}/${subProtocol.options.network.identifier}`)
        .catch(err => console.error(err))
    } else {
      this.router
        .navigateByUrl(`/account-import-onboarding/${DataServiceKey.PROTOCOL}/${subProtocol.identifier}`)
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private showImportInteractionSelection(protocol: ICoinProtocol) {
    const info = {
      callback: (interactionType: AccountImportInteractionType) => {
        switch (interactionType) {
          case AccountImportInteractionType.VAULT:
            this.importFromVault(protocol)
            break
          case AccountImportInteractionType.LEDGER:
            this.importFromLedger(protocol)
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

  private async importFromLedger(protocol: ICoinProtocol): Promise<void> {
    this.router
      .navigateByUrl(`/account-import-ledger-onboarding/${DataServiceKey.PROTOCOL}/${protocol.identifier}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private importFromVault(protocol: ICoinProtocol) {
    this.router
      .navigateByUrl(`/account-import-onboarding/${DataServiceKey.PROTOCOL}/${protocol.identifier}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public navigateToScan() {
    this.router.navigateByUrl('/tabs/scan').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
