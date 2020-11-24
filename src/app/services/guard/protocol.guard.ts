import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router'
import { ICoinProtocol } from 'airgap-coin-lib'
import { MainProtocolSymbols, SubProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'
import { ProtocolService } from '@airgap/angular-core'

@Injectable()
export class ProtocolGuard implements CanActivate {
  constructor(public readonly router: Router, private readonly protocolService: ProtocolService) {}

  public async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const protocolID = route.params.protocolID
    const mainProtocolID = route.params.mainProtocolID

    const mainSymbols = Object.values(MainProtocolSymbols).map(p => p.toString())
    let subSymbols = Object.values(SubProtocolSymbols).map(p => p.toString())

    if (mainProtocolID && mainProtocolID !== 'undefined') {
      if (mainProtocolID === MainProtocolSymbols.ETH) {
        subSymbols = (await this.protocolService.getSubProtocols(mainProtocolID)).map((protocol: ICoinProtocol) =>
          protocol.identifier.toString()
        )
      }

      return subSymbols.includes(protocolID)
    } else {
      return mainSymbols.includes(protocolID) || subSymbols.includes(protocolID)
    }
  }
}
