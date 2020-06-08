import { SubstrateLedgerApp } from './SubstrateLedgerApp'
import { SubstrateProtocol, PolkadotProtocol } from 'airgap-coin-lib'

export class PolkadotLedgerApp extends SubstrateLedgerApp {
  protected readonly scrambleKey: string = 'DOT'
  protected readonly protocol: SubstrateProtocol = new PolkadotProtocol()
}
