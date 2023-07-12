import { ProtocolService } from '@airgap/angular-core'
import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Router } from '@angular/router'
import { ICoinProtocol, ICoinSubProtocol } from '@airgap/coinlib-core'

@Injectable()
export class ProtocolGuard {
  public constructor(public readonly router: Router, private readonly protocolService: ProtocolService) {}

  public async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const protocolID: string = route.params.protocolID

    const [mainProtocols, subProtocols]: [ICoinProtocol[], ICoinSubProtocol[]] = await Promise.all([
      this.protocolService.getSupportedProtocols(),
      this.protocolService.getSupportedSubProtocols().then((subProtocolsMap) => {
        const innerMap = Object.values(subProtocolsMap)

        return innerMap.flatMap((obj) => Object.values(obj))
      })
    ])

    const mainSymbols: Set<string> = new Set(mainProtocols.map((protocol: ICoinProtocol) => protocol.identifier.toString()))
    const subSymbols: Set<string> = new Set(subProtocols.map((protocol: ICoinSubProtocol) => protocol.identifier.toString()))

    return mainSymbols.has(protocolID) || subSymbols.has(protocolID)
  }
}
