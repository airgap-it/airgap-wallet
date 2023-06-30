import { ProtocolService } from '@airgap/angular-core'
import { Action, ICoinProtocol, SubProtocolSymbols } from '@airgap/coinlib-core'
import { IAirGapAddressResult } from '@airgap/coinlib-core/interfaces/IAirGapAddress'

export interface TezosImportKtAccountActionContext {
  publicKey: string
  protocolService: ProtocolService
}

export class TezosImportKtAccountAction extends Action<string[], TezosImportKtAccountActionContext> {
  public get identifier(): string {
    return 'tezos-import-account-action'
  }

  protected async perform(): Promise<string[]> {
    try {
      const protocol: ICoinProtocol = await this.context.protocolService.getProtocol(SubProtocolSymbols.XTZ_KT)
      const ktAddresses: IAirGapAddressResult[] = await protocol.getAddressesFromPublicKey(this.context.publicKey)

      return ktAddresses.map((address: IAirGapAddressResult) => address.address)
    } catch {
      return []
    }
  }
}
