import { SubstrateLedgerApp } from './SubstrateLedgerApp'
import { SubstrateProtocol, PolkadotProtocol } from 'airgap-coin-lib'
import { ProtocolSymbols } from 'src/app/services/protocols/protocols'

export class PolkadotLedgerApp extends SubstrateLedgerApp {
  protected protocol: SubstrateProtocol = new PolkadotProtocol()
  public protocolIdentifier: ProtocolSymbols = ProtocolSymbols.POLKADOT
}
