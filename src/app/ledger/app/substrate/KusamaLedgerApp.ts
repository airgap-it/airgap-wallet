import { SubstrateLedgerApp } from './SubstrateLedgerApp'
import { SubstrateProtocol, KusamaProtocol } from 'airgap-coin-lib'

export class KusamaLedgerApp extends SubstrateLedgerApp {
  protected protocol: SubstrateProtocol = new KusamaProtocol()
}
