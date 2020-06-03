import { SubstrateLedgerApp } from './SubstrateLedgerApp'
import { SubstrateProtocol, PolkadotProtocol } from 'airgap-coin-lib'

export class PolkadotLedgerApp extends SubstrateLedgerApp {
  public scrambleKey: string = 'DOT'
  protected protocol: SubstrateProtocol = new PolkadotProtocol()
}
