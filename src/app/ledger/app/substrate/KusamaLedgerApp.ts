import { SubstrateLedgerApp } from './SubstrateLedgerApp'
import { SubstrateProtocol, KusamaProtocol } from 'airgap-coin-lib'

export class KusamaLedgerApp extends SubstrateLedgerApp {
  public scrambleKey: string = 'KSM'
  protected protocol: SubstrateProtocol = new KusamaProtocol()
}
