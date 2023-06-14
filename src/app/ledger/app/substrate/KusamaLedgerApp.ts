import { createV0KusamaProtocol, ICoinProtocolAdapter } from '@airgap/angular-core'
import { KusamaProtocol, PolkadotProtocolConfiguration } from '@airgap/polkadot'
import { newKusamaApp, SubstrateApp } from '@zondax/ledger-substrate'

import { SubstrateLedgerApp } from './SubstrateLedgerApp'

export class KusamaLedgerApp extends SubstrateLedgerApp<PolkadotProtocolConfiguration> {
  protected async createProtocol(): Promise<ICoinProtocolAdapter<KusamaProtocol>> {
    return createV0KusamaProtocol()
  }

  protected getApp(): SubstrateApp {
    return newKusamaApp(this.connection.transport)
  }
}
