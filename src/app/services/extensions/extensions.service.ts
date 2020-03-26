import { Injectable } from '@angular/core'
import { ICoinDelegateProtocol, PolkadotProtocol } from 'airgap-coin-lib'
import { ProtocolDelegationExtensions } from 'src/app/extensions/delegation/ProtocolDelegationExtensions'
import { PolkadotDelegationExtensions } from 'src/app/extensions/delegation/PolkadotDelegationExtensions'

@Injectable({
  providedIn: 'root'
})
export class ExtensionsService {
  private extensions: [new () => ICoinDelegateProtocol, () => ProtocolDelegationExtensions<any>][] = [
    [PolkadotProtocol, PolkadotDelegationExtensions.create]
  ]
  public async loadDelegationExtensions(): Promise<void> {
    for (let [protocol, extensionFactory] of this.extensions) {
      ProtocolDelegationExtensions.load(protocol, extensionFactory())
    }
  }
}
