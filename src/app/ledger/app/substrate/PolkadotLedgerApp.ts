import { PolkadotProtocol } from '@airgap/polkadot'
import { SubstrateNetwork, SubstrateProtocol } from '@airgap/substrate'
import { newPolkadotApp, SubstrateApp } from '@zondax/ledger-substrate'

import { SubstrateLedgerApp } from './SubstrateLedgerApp'

export class PolkadotLedgerApp extends SubstrateLedgerApp<SubstrateNetwork.POLKADOT> {
  protected readonly protocol: SubstrateProtocol<SubstrateNetwork.POLKADOT> = new PolkadotProtocol()

  protected getApp(): SubstrateApp {
    return newPolkadotApp(this.connection.transport)
  }
}
