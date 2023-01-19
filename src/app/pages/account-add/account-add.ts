import { ProtocolService } from '@airgap/angular-core'
import { MainProtocolSymbols, ICoinProtocol, SubProtocolSymbols, ICoinSubProtocol, ProtocolSymbols } from '@airgap/coinlib-core'
import { NetworkType } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { TezosFAProtocol, TezosFA2Protocol } from '@airgap/tezos'
import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { Platform } from '@ionic/angular'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { LedgerService } from '../../services/ledger/ledger-service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { faProtocolSymbol, GenericSubProtocolSymbol } from '../../types/GenericProtocolSymbols'
import { AccountImportInteractionType } from '../account-import-interaction-selection/account-import-interaction-selection'

interface GenericSubProtocol {
  name: string
  identifier: GenericSubProtocolSymbol
  symbol: string
  mainIdentifier: MainProtocolSymbols
  network?: string
}

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
  public genericSubAccountProtocols: GenericSubProtocol[] = [
    {
      name: 'account-add.generic.xtz_label',
      identifier: GenericSubProtocolSymbol.XTZ_FA,
      symbol: 'XTZ',
      mainIdentifier: MainProtocolSymbols.XTZ
    }
  ]

  public filteredAccountProtocols: ICoinProtocol[] = []
  public filteredFeaturedSubAccountProtocols: ICoinProtocol[] = []
  public filteredOtherSubAccountProtocols: ICoinProtocol[] = []
  public filteredGenericSubAccountProtocols: GenericSubProtocol[] = []

  private featuredSubProtocols: SubProtocolSymbols[] = [
    SubProtocolSymbols.XTZ_YOU,
    SubProtocolSymbols.XTZ_UUSD,
    SubProtocolSymbols.XTZ_UDEFI,
    SubProtocolSymbols.XTZ_UBTC
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
      (protocol) => protocol.options.network.type === NetworkType.MAINNET
    )
    const supportedSubAccountProtocols: ICoinSubProtocol[] = Array.prototype.concat.apply(
      [],
      await Promise.all(Object.values(MainProtocolSymbols).map((protocol) => this.protocolService.getSubProtocols(protocol)))
    )

    this.featuredSubAccountProtocols = supportedSubAccountProtocols.filter(
      (protocol) =>
        this.featuredSubProtocols.includes(protocol.identifier.toLowerCase() as SubProtocolSymbols) &&
        protocol.options.network.type === NetworkType.MAINNET &&
        protocol.identifier !== SubProtocolSymbols.XTZ_KT
    )

    const mappedGenericIdentifier = (protocol: TezosFAProtocol): string => {
      let interfaceVersion: '1.2' | '2' = '1.2'
      let tokenId = 0
      if (protocol instanceof TezosFA2Protocol) {
        interfaceVersion = '2'
        tokenId = protocol.tokenID ?? 0
      }
      return faProtocolSymbol(interfaceVersion, protocol.options.config.contractAddress, tokenId)
    }
    const xtzSubProtocols = supportedSubAccountProtocols.filter(
      (protocol): protocol is TezosFAProtocol => protocol instanceof TezosFAProtocol
    )
    const standardSubprotocols = xtzSubProtocols.filter((protocol) =>
      Object.values(SubProtocolSymbols).includes(protocol.identifier.toLowerCase() as SubProtocolSymbols)
    )
    const genericSubprotocols = xtzSubProtocols.filter(
      (protocol) => !Object.values(SubProtocolSymbols).includes(protocol.identifier.toLowerCase() as SubProtocolSymbols)
    )
    const toFilter = standardSubprotocols
      .map((protocol) => mappedGenericIdentifier(protocol))
      .filter((identifier) => genericSubprotocols.find((protocol) => protocol.identifier === identifier) !== undefined)

    this.otherSubAccountProtocols = supportedSubAccountProtocols.filter(
      (protocol) =>
        !this.featuredSubProtocols.includes(protocol.identifier.toLowerCase() as SubProtocolSymbols) &&
        protocol.options.network.type === NetworkType.MAINNET &&
        protocol.identifier !== SubProtocolSymbols.XTZ_KT &&
        !toFilter.includes(protocol.identifier)
    )
    this.filterProtocols()
  }

  public searchTermChanged() {
    this.filterProtocols()
  }

  public filterProtocols() {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase()

    this.filteredAccountProtocols = this.supportedAccountProtocols.filter(
      (protocol) => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredFeaturedSubAccountProtocols = this.featuredSubAccountProtocols.filter(
      (protocol) => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredOtherSubAccountProtocols = this.otherSubAccountProtocols.filter(
      (protocol) => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredGenericSubAccountProtocols = this.genericSubAccountProtocols.filter(
      (protocol) =>
        protocol.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        protocol.identifier.toLowerCase().includes(lowerCaseSearchTerm) ||
        protocol.mainIdentifier.toLowerCase().includes(lowerCaseSearchTerm)
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
    const mainProtocolIdentifier = subProtocol.identifier.split('-')[0] as MainProtocolSymbols
    if (this.mainAccountExists(mainProtocolIdentifier, subProtocol.options.network.identifier)) {
      this.router
        .navigateByUrl(`/sub-account-import/${DataServiceKey.PROTOCOL}/${subProtocol.identifier}/${subProtocol.options.network.identifier}`)
        .catch((err) => console.error(err))
    } else {
      this.showOnboarding(subProtocol.identifier)
    }
  }

  public addGenericSubAccount(customSubProtocol: GenericSubProtocol) {
    if (this.mainAccountExists(customSubProtocol.mainIdentifier, customSubProtocol.network)) {
      this.router
        .navigateByUrl(
          `/sub-account-add-generic/${DataServiceKey.PROTOCOL}/${customSubProtocol.mainIdentifier}/${customSubProtocol.network}/${customSubProtocol.identifier}`
        )
        .catch((err) => console.error(err))
    } else {
      this.showOnboarding(customSubProtocol.mainIdentifier)
    }
  }

  private mainAccountExists(protocolIdentifier: MainProtocolSymbols, networkIdentifier?: string): boolean {
    return (
      this.accountProvider
        .getWalletList()
        .filter(
          (wallet) =>
            wallet.protocol.identifier === protocolIdentifier &&
            (!networkIdentifier || wallet.protocol.options.network.identifier === networkIdentifier)
        ).length > 0
    )
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
            console.log('Unknown import interaction type selected.')
        }
      }
    }

    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router
      .navigateByUrl(`/account-import-interaction-selection/${DataServiceKey.INTERACTION}`, { skipLocationChange: true })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private importFromLedger(protocol: ICoinProtocol): void {
    this.router
      .navigateByUrl(`/account-import-ledger-onboarding/${DataServiceKey.PROTOCOL}/${protocol.identifier}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private importFromVault(protocol: ICoinProtocol): void {
    if (this.accountProvider.hasInactiveWallets(protocol)) {
      this.router
        .navigateByUrl(`/account-activate/${DataServiceKey.PROTOCOL}/${protocol.identifier}`)
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      this.showOnboarding(protocol.identifier)
    }
  }

  private showOnboarding(protocolIdentifier: ProtocolSymbols) {
    this.router
      .navigateByUrl(`/account-import-onboarding/${DataServiceKey.PROTOCOL}/${protocolIdentifier}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public navigateToScan() {
    this.router.navigateByUrl('/tabs/scan').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
