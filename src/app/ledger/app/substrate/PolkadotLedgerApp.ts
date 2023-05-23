import { createV0PolkadotProtocol, ICoinProtocolAdapter } from '@airgap/angular-core'
import { PolkadotProtocol, PolkadotProtocolConfiguration } from '@airgap/polkadot'
import { newPolkadotApp, SubstrateApp } from '@zondax/ledger-substrate'

import { SubstrateLedgerApp } from './SubstrateLedgerApp'

export class PolkadotLedgerApp extends SubstrateLedgerApp<PolkadotProtocolConfiguration> {
  protected async createProtocol(): Promise<ICoinProtocolAdapter<PolkadotProtocol>> {
    return createV0PolkadotProtocol()
  }

  protected getApp(): SubstrateApp {
    return newPolkadotApp(this.connection.transport)
  }
}
