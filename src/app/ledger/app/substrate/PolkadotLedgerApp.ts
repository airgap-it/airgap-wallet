import { newPolkadotApp, SubstrateApp } from '@zondax/ledger-substrate'
import { PolkadotProtocol, SubstrateNetwork, SubstrateProtocol } from '@airgap/coinlib-core'

import { SubstrateLedgerApp } from './SubstrateLedgerApp'

export class PolkadotLedgerApp extends SubstrateLedgerApp<SubstrateNetwork.POLKADOT> {
  protected readonly protocol: SubstrateProtocol<SubstrateNetwork.POLKADOT> = new PolkadotProtocol()

  protected getApp(): SubstrateApp {
    return newPolkadotApp(this.connection.transport)
  }
}
