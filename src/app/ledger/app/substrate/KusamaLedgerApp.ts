import { SubstrateLedgerApp } from './SubstrateLedgerApp'
import { SubstrateProtocol, KusamaProtocol } from 'airgap-coin-lib'

export class KusamaLedgerApp extends SubstrateLedgerApp {
  protected readonly scrambleKey: string = 'KSM'
  protected readonly protocol: SubstrateProtocol = new KusamaProtocol()
}
