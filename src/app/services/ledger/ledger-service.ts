import { Injectable } from '@angular/core'

import { AirGapMarketWallet } from 'airgap-coin-lib'

import { ProtocolSymbols } from '../protocols/protocols'
import { LedgerConnectionDetails, LedgerConnection, LedgerConnectionType } from 'src/app/ledger/connection/LedgerConnection'
import { LedgerApp } from 'src/app/ledger/app/LedgerApp'
import { KusamaLedgerApp } from 'src/app/ledger/app/substrate/KusamaLedgerApp'
import { PolkadotLedgerApp } from 'src/app/ledger/app/substrate/PolkadotLedgerApp'
import { isType } from 'src/app/utils/utils'
import { ReturnCode } from 'src/app/ledger/ReturnCode'
import { LedgerConnectionProvider } from './ledger-connection-provider'

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private readonly supportedApps: Map<string, (connection: LedgerConnection) => LedgerApp> = new Map([
    [ProtocolSymbols.KUSAMA, (connection: LedgerConnection): LedgerApp => new KusamaLedgerApp(connection)],
    [ProtocolSymbols.POLKADOT, (connection: LedgerConnection): LedgerApp => new PolkadotLedgerApp(connection)]
  ] as [string, (connection: LedgerConnection) => LedgerApp][])

  private readonly openConnections: Map<string, LedgerConnection> = new Map()
  private readonly runningApps: Map<string, LedgerApp> = new Map()

  constructor(private readonly connectionProvider: LedgerConnectionProvider) {}

  public getSupportedProtocols(): string[] {
    return Array.from(this.supportedApps.keys())
  }

  public async getConnectedDevices(protocolIdentifier: string): Promise<LedgerConnectionDetails[]> {
    const devices: [LedgerConnectionDetails[], LedgerConnectionDetails[]] = await Promise.all([
      this.connectionProvider.getConnectedDevices(protocolIdentifier, LedgerConnectionType.USB),
      this.connectionProvider.getConnectedDevices(protocolIdentifier, LedgerConnectionType.BLE)
    ])

    return devices.reduce((flatten: LedgerConnectionDetails[], toFlatten: LedgerConnectionDetails[]) => flatten.concat(toFlatten), [])
  }

  public async openConnection(protocolIdentifier: string, ledgerConnection?: LedgerConnectionDetails): Promise<void> {
    await this.openLedgerConnection(protocolIdentifier, ledgerConnection)
  }

  public async closeConnection(ledgerConnection?: LedgerConnectionDetails): Promise<void> {
    if (!ledgerConnection) {
      return this.closeAllLedgerConnections()
    } else {
      return this.closeLedgerConnection(ledgerConnection)
    }
  }

  public async importWallet(protocolIdentifier: string, ledgerConnection?: LedgerConnectionDetails): Promise<AirGapMarketWallet> {
    return this.withApp(protocolIdentifier, (app: LedgerApp) => app.importWallet(), ledgerConnection)
  }

  public async signTransaction(protocolIdentifier: string, transaction: any, ledgerConnection?: LedgerConnectionDetails): Promise<string> {
    return this.withApp(protocolIdentifier, (app: LedgerApp) => app.signTransaction(transaction), ledgerConnection)
  }

  private async withApp<T>(
    identifier: string,
    action: (app: LedgerApp) => Promise<T>,
    ledgerConnection?: LedgerConnectionDetails
  ): Promise<T> {
    const appKey: string = this.getAppKey(identifier, ledgerConnection)

    let app: LedgerApp | undefined = this.runningApps.get(appKey)
    if (!app) {
      app = await this.openLedgerApp(identifier, ledgerConnection)
      app.init()

      this.runningApps.set(appKey, app)
    }

    return action(app)
      .catch((error: unknown) => Promise.reject(this.getError(error)))
      .finally(() => this.closeLedgerConnection(ledgerConnection))
  }

  private async openLedgerConnection(protocolIdentifier: string, ledgerConnection?: LedgerConnectionDetails): Promise<LedgerConnection> {
    const connection: LedgerConnection | null = await this.connectionProvider.open(protocolIdentifier, ledgerConnection)
    this.openConnections.set(this.getConnectionKey(ledgerConnection), connection)

    return connection
  }

  private async closeAllLedgerConnections(): Promise<void> {
    await Promise.all(Array.from(this.openConnections.values()).map((connection: LedgerConnection) => connection.transport.close()))
    this.openConnections.clear()
    this.runningApps.clear()
  }

  private async closeLedgerConnection(ledgerConnection?: LedgerConnectionDetails): Promise<void> {
    const connectionKey: string = this.getConnectionKey(ledgerConnection)
    const connection: LedgerConnection | undefined = this.openConnections.get(connectionKey)
    if (connection) {
      connection.transport.close()

      this.openConnections.delete(connectionKey)
      Array.from(this.runningApps.keys())
        .filter((key: string) => key.includes(connectionKey))
        .forEach((key: string) => this.runningApps.delete(key))
    }
  }

  private async openLedgerApp(identifier: string, ledgerConnection?: LedgerConnectionDetails): Promise<LedgerApp> {
    const appFactory: (connection: LedgerConnection) => LedgerApp = this.supportedApps.get(identifier)

    if (!appFactory) {
      return Promise.reject(`${identifier} Ledger app is not supported`)
    }

    const connectionKey: string = this.getConnectionKey(ledgerConnection)
    let connection: LedgerConnection | undefined = this.openConnections.get(connectionKey)
    if (!connection) {
      connection = await this.openLedgerConnection(identifier, ledgerConnection)
    }

    return appFactory(connection)
  }

  private getConnectionKey(ledgerConnection?: LedgerConnectionDetails): string {
    return ledgerConnection ? `${ledgerConnection.type}_${ledgerConnection.descriptor}` : 'defaultConnection'
  }

  private getAppKey(identifier: string, ledgerConnection?: LedgerConnectionDetails): string {
    return `${identifier}_${this.getConnectionKey(ledgerConnection)}`
  }

  private getError(error: unknown): string | unknown {
    function getErrorFromStatusCode(statusCode: number): string | null {
      switch (statusCode) {
        case ReturnCode.CLA_NOT_SUPPORTED:
          return "Could not detect the app. Make sure it's open."
        default:
          return null
      }
    }

    if (isType<{ statusCode: number }>(error, 'statusCode')) {
      const errorMessage: string | null = getErrorFromStatusCode(error.statusCode)
      if (errorMessage) {
        return errorMessage
      }
    }

    if (isType<{ message: string }>(error, 'message')) {
      return error.message
    }

    return error
  }
}
