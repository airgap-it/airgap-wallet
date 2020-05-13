import { Injectable } from '@angular/core'

import { AirGapMarketWallet } from 'airgap-coin-lib'

import { ProtocolSymbols } from '../protocols/protocols'
import { LedgerConnection, LedgerTransport, LedgerConnectionType } from 'src/app/ledger/transport/LedgerTransport'
import { LedgerTransportElectron } from 'src/app/ledger/transport/LedgerTransportElectron'
import { LedgerApp } from 'src/app/ledger/app/LedgerApp'
import { KusamaLedgerApp } from 'src/app/ledger/app/substrate/KusamaLedgerApp'
import { PolkadotLedgerApp } from 'src/app/ledger/app/substrate/PolkadotLedgerApp'

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private readonly supportedApps: Map<string, (transport: LedgerTransport) => LedgerApp> = new Map([
    [ProtocolSymbols.KUSAMA, transport => new KusamaLedgerApp(transport)],
    [ProtocolSymbols.POLKADOT, transport => new PolkadotLedgerApp(transport)]
  ] as [string, (transport: LedgerTransport) => LedgerApp][])

  public async getConnectedDevices(): Promise<LedgerConnection[]> {
    const devices = await Promise.all([
      LedgerTransportElectron.getConnectedDevices(LedgerConnectionType.USB),
      LedgerTransportElectron.getConnectedDevices(LedgerConnectionType.BLE)
    ])

    return devices.reduce((flatten, toFlatten) => flatten.concat(toFlatten), [])
  }

  public async importWallet(identifier: string, ledgerConnection: LedgerConnection): Promise<AirGapMarketWallet> {
    return this.openApp(identifier, ledgerConnection, app => app.importWallet())
  }

  public async signTransaction(identifier: string, ledgerConnection: LedgerConnection, transaction: any): Promise<string> {
    return this.openApp(identifier, ledgerConnection, app => app.signTranscation(transaction))
  }

  private async openApp<T>(identifier: string, ledgerConnection: LedgerConnection, action: (app: LedgerApp) => Promise<T>): Promise<T> {
    const appFactory: (transport: LedgerTransport) => LedgerApp = this.supportedApps[identifier]

    if (appFactory) {
      const transport = await LedgerTransportElectron.open(ledgerConnection.type, ledgerConnection.descriptor)
      const app = appFactory(transport)

      return action(app).finally(() => transport.close())
    } else {
      return Promise.reject('Protocol app is not supported')
    }
  }
}
