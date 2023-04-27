import { ProtocolService } from '@airgap/angular-core'
import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router'
import { ICoinProtocol } from '@airgap/coinlib-core'
import { MainProtocolSymbols, SubProtocolSymbols } from '@airgap/coinlib-core/utils/ProtocolSymbols'

@Injectable()
export class ProtocolGuard implements CanActivate {
  constructor(public readonly router: Router, private readonly protocolService: ProtocolService) {}

  public async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const protocolID: string = route.params.protocolID
    let mainProtocolID: string
    const protocolIDComponents: string[] = protocolID.split('-')
    if (protocolIDComponents.length > 1) {
      mainProtocolID = protocolIDComponents[0]
    }

    const mainSymbols: string[] = Object.values(MainProtocolSymbols).map((p: MainProtocolSymbols) => p.toString())
    let subSymbols: string[] = Object.values(SubProtocolSymbols).map((p: SubProtocolSymbols) => p.toString())

    if (mainProtocolID !== undefined) {
      if (mainProtocolID === MainProtocolSymbols.ETH || mainProtocolID === MainProtocolSymbols.RBTC || mainProtocolID === MainProtocolSymbols.XTZ) {
        subSymbols = (await this.protocolService.getAllSubProtocols(mainProtocolID)).map((protocol: ICoinProtocol) =>
          protocol.identifier.toString()
        )
      }

      return subSymbols.includes(protocolID)
    } else {
      return mainSymbols.includes(protocolID) || subSymbols.includes(protocolID)
    }
  }
}
