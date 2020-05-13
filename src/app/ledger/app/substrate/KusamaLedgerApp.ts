import { SubstrateLedgerApp } from './SubstrateLedgerApp'
import { SubstrateProtocol, KusamaProtocol } from 'airgap-coin-lib'
import { ProtocolSymbols } from 'src/app/services/protocols/protocols'

export class KusamaLedgerApp extends SubstrateLedgerApp {
  protected protocol: SubstrateProtocol = new KusamaProtocol()
  public protocolIdentifier: ProtocolSymbols = ProtocolSymbols.KUSAMA
}
