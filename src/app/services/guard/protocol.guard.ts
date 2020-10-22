import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router'
import { AirGapMarketWallet, ICoinProtocol } from 'airgap-coin-lib'
import { MainProtocolSymbols, SubProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'
import { ProtocolService } from '@airgap/angular-core'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'

import { AccountProvider } from '../account/account.provider'

@Injectable()
export class ProtocolGuard implements CanActivate {
  public supportedAccountProtocols: ICoinProtocol[] = []
  public featuredSubAccountProtocols: ICoinProtocol[] = []
  public otherSubAccountProtocols: ICoinProtocol[] = []
  public filteredOtherSubAccountProtocols: ICoinProtocol[] = []
  private featuredSubProtocols: SubProtocolSymbols[] = [
    SubProtocolSymbols.XTZ_KT,
    SubProtocolSymbols.XTZ_BTC,
    SubProtocolSymbols.XTZ_USD,
    SubProtocolSymbols.XTZ_STKR,
    SubProtocolSymbols.ETH_ERC20_XCHF
  ]
  public searchTerm: string = ''
  public otherSubAccountProtocolSymbols = []

  constructor(
    public readonly router: Router,
    private readonly accountProvider: AccountProvider,
    private readonly protocolService: ProtocolService
  ) {}
  public async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const protocolID = route.params.protocolID
    const mainProtocolID = route.params.mainProtocolID
    const publicKey = route.params.publicKey
    let addressIndex = route.params.addressIndex

    const supportedSubAccountProtocols = Array.prototype.concat.apply(
      [],
      await Promise.all(Object.values(MainProtocolSymbols).map(protocol => this.protocolService.getSubProtocols(protocol)))
    )

    this.otherSubAccountProtocols = supportedSubAccountProtocols.filter(
      protocol =>
        !this.featuredSubProtocols.includes(protocol.identifier.toLowerCase()) &&
        protocol.options.network.type === NetworkType.MAINNET &&
        protocol.identifier !== SubProtocolSymbols.XTZ_KT
    )
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase()

    this.filteredOtherSubAccountProtocols = this.otherSubAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredOtherSubAccountProtocols.forEach(protocol => {
      this.otherSubAccountProtocolSymbols.push(protocol.identifier)
    })

    const combinedProtocolSymbols = { ...SubProtocolSymbols, ...MainProtocolSymbols, ...this.otherSubAccountProtocolSymbols }

    if (mainProtocolID && mainProtocolID !== 'undefined') {
      if (!(Object.values(MainProtocolSymbols).includes(mainProtocolID) && Object.values(SubProtocolSymbols).includes(protocolID))) {
        window.alert("The protocol you're trying to access is invalid1")
        this.router.navigateByUrl('/')
      }

      return Object.values(MainProtocolSymbols).includes(mainProtocolID) && Object.values(SubProtocolSymbols).includes(protocolID)
    }
    if (!Object.values(combinedProtocolSymbols).includes(protocolID)) {
      window.alert("The protocol you're trying to access is invalid2")
      this.router.navigateByUrl('/')
    }
    if (publicKey) {
      if (addressIndex === 'undefined') {
        addressIndex = undefined
      }
      const wallet: AirGapMarketWallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(
        publicKey,
        protocolID,
        addressIndex
      )

      if (mainProtocolID && mainProtocolID !== 'undefined') {
        const mainWallet: AirGapMarketWallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(
          publicKey,
          mainProtocolID,
          addressIndex
        )

        return wallet !== undefined && mainWallet !== undefined
      }

      return wallet !== undefined
    }

    return Object.values(combinedProtocolSymbols).includes(protocolID)
  }
}
