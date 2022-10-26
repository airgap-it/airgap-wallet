import { KusamaProtocol } from '@airgap/polkadot'
import { SubstrateNetwork, SubstrateProtocol } from '@airgap/substrate'
import { newKusamaApp, SubstrateApp } from '@zondax/ledger-substrate'

import { SubstrateLedgerApp } from './SubstrateLedgerApp'

export class KusamaLedgerApp extends SubstrateLedgerApp<SubstrateNetwork.KUSAMA> {
  protected readonly protocol: SubstrateProtocol<SubstrateNetwork.KUSAMA> = new KusamaProtocol()

  protected getApp(): SubstrateApp {
    return newKusamaApp(this.connection.transport)
  }
}
