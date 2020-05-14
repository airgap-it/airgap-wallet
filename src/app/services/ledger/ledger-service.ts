import { Injectable } from '@angular/core'

import { AirGapMarketWallet, ICoinProtocol, supportedProtocols } from 'airgap-coin-lib'

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

  private readonly openTransports: Map<string, LedgerTransport> = new Map()
  private readonly runningApps: Map<string, LedgerApp> = new Map()

  public getSupportedProtocols(): ICoinProtocol[] {
    const protocolIdentifiers: string[] = Array.from(this.supportedApps.keys())
    return supportedProtocols().filter(protocol => protocolIdentifiers.includes(protocol.identifier))
  }

  public async getConnectedDevices(): Promise<LedgerConnection[]> {
    const devices = await Promise.all([
      LedgerTransportElectron.getConnectedDevices(LedgerConnectionType.USB),
      LedgerTransportElectron.getConnectedDevices(LedgerConnectionType.BLE)
    ])

    return devices.reduce((flatten, toFlatten) => flatten.concat(toFlatten), [])
  }

  public async openConnection(ledgerConnection: LedgerConnection): Promise<void> {
    await this.openLedgerTransport(ledgerConnection)
  }

  public async closeConnection(ledgerConnection?: LedgerConnection): Promise<void> {
    if (!ledgerConnection) {
      this.closeAllLedgerTransports()
    } else {
      this.closeLedgerTransport(ledgerConnection)
    }
  }

  public async importWallet(identifier: string, ledgerConnection: LedgerConnection): Promise<AirGapMarketWallet> {
    return this.withApp(identifier, ledgerConnection, app => app.importWallet())
  }

  public async signTransaction(identifier: string, ledgerConnection: LedgerConnection, transaction: any): Promise<string> {
    return this.withApp(identifier, ledgerConnection, app => app.signTranscation(transaction))
  }

  private async withApp<T>(identifier: string, ledgerConnection: LedgerConnection, action: (app: LedgerApp) => Promise<T>): Promise<T> {
    const appKey = this.getAppKey(identifier, ledgerConnection)
    let app = this.runningApps.get(appKey)
    if (!app) {
      app = await this.openLedgerApp(identifier, ledgerConnection)
    }

    const isAvailable = await app.isAvailable()
    if (isAvailable) {
      return action(app)
    } else {
      return Promise.reject(`Couldn't find app for ${identifier} protocol.`)
    }
  }

  private async openLedgerTransport(ledgerConnection: LedgerConnection): Promise<LedgerTransport> {
    const transport = await LedgerTransportElectron.open(ledgerConnection.type, ledgerConnection.descriptor)
    this.openTransports.set(this.getTransportKey(ledgerConnection), transport)

    return transport
  }

  private async closeAllLedgerTransports(): Promise<void> {
    await Promise.all(Array.from(this.openTransports.values()).map(transport => transport.close()))
    this.openTransports.clear()
    this.runningApps.clear()
  }

  private async closeLedgerTransport(ledgerConnection: LedgerConnection): Promise<void> {
    const transportKey = this.getTransportKey(ledgerConnection)
    const transport = this.openTransports.get(transportKey)
    if (transport) {
      await transport.close()

      this.openTransports.delete(transportKey)
      Array.from(this.runningApps.keys())
        .filter(key => key.includes(transportKey))
        .forEach(key => this.runningApps.delete(key))
    }
  }

  private async openLedgerApp(identifier: string, ledgerConnection: LedgerConnection): Promise<LedgerApp> {
    const appFactory: (transport: LedgerTransport) => LedgerApp = this.supportedApps.get(identifier)

    if (!appFactory) {
      return Promise.reject(`${identifier} Ledger app is not supported`)
    }

    const transportKey = this.getTransportKey(ledgerConnection)
    let transport = this.openTransports.get(transportKey)
    if (!transport) {
      transport = await this.openLedgerTransport(ledgerConnection)
    }

    return appFactory(transport)
  }

  private getTransportKey(ledgerConnection: LedgerConnection): string {
    return `${ledgerConnection.type}_${ledgerConnection.descriptor}`
  }

  private getAppKey(identifier: string, ledgerConnection: LedgerConnection): string {
    return `${identifier}_${this.getTransportKey(ledgerConnection)}`
  }
}
