import { getProtocolAndNetworkIdentifier, ProtocolService } from '@airgap/angular-core'
import { ICoinProtocol, ProtocolSymbols } from '@airgap/coinlib-core'
import { Component } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'

import { DataServiceKey } from '../../services/data/data.service'
import { WalletStorageKey, WalletStorageService } from '../../services/storage/storage'
import { GenericSubProtocolSymbol } from '../../types/GenericProtocolSymbols'

@Component({
  selector: 'page-sub-account-add-generic',
  templateUrl: 'sub-account-add-generic.html',
  styleUrls: ['./sub-account-add-generic.scss']
})
export class SubAccountAddGenericPage {
  public readonly GenericSubProtocolSymbol: typeof GenericSubProtocolSymbol = GenericSubProtocolSymbol

  public readonly protocolID: ProtocolSymbols
  public readonly networkID: string | undefined
  public readonly genericSubProtocolType: GenericSubProtocolSymbol

  public readonly genericSubProtocolName: string

  public protocol: ICoinProtocol | undefined

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly protocolService: ProtocolService,
    private readonly storage: WalletStorageService
  ) {
    this.protocolID = this.route.snapshot.params.protocolID
    this.networkID = this.route.snapshot.params.networkID
    this.genericSubProtocolType = this.route.snapshot.params.genericSubProtocolType

    this.genericSubProtocolName = `add-generic-sub-account.${this.genericSubProtocolType}.name`
  }

  public saveProtocol(protocol: ICoinProtocol): void {
    this.protocol = protocol
  }

  public async addGenericSubAccount(): Promise<void> {
    if (!this.protocol) {
      return
    }

    await this.saveGenericProtocol(this.protocol)

    this.router
      .navigateByUrl(`/sub-account-import/${DataServiceKey.PROTOCOL}/${this.protocol.identifier}/${this.protocol.options.network.identifier}`)
      .catch((err) => console.error(err))
  }

  private async saveGenericProtocol(protocol: ICoinProtocol): Promise<void> {
    const protocolNetworkIdentifier = getProtocolAndNetworkIdentifier(protocol)

    await Promise.all([
      this.protocolService.addActiveSubProtocols(protocol),
      this.storage.get(WalletStorageKey.GENERIC_SUBPROTOCOLS).then((genericSubProtocols) => {
        return this.storage.set(
          WalletStorageKey.GENERIC_SUBPROTOCOLS,
          Object.assign(genericSubProtocols, { [protocolNetworkIdentifier]: protocol.options })
        )
      })
    ])
  }
}
