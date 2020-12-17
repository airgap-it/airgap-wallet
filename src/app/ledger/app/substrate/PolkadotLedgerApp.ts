import { newPolkadotApp, SubstrateApp } from '@zondax/ledger-polkadot'
import { PolkadotProtocol, SubstrateProtocol } from '@airgap/coinlib-core'

import { SubstrateLedgerApp } from './SubstrateLedgerApp'

export class PolkadotLedgerApp extends SubstrateLedgerApp {
  protected readonly protocol: SubstrateProtocol = new PolkadotProtocol()

  protected getApp(): SubstrateApp {
    return newPolkadotApp(this.connection.transport)
  }
}
