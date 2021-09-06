import { Injectable } from '@angular/core'
import { Platform } from '@ionic/angular'
import { AirGapMarketWallet, ICoinProtocol, MainProtocolSymbols, ProtocolSymbols } from '@airgap/coinlib-core'

import { LedgerApp } from '../../ledger/app/LedgerApp'
import { KusamaLedgerApp } from '../../ledger/app/substrate/KusamaLedgerApp'
import { PolkadotLedgerApp } from '../../ledger/app/substrate/PolkadotLedgerApp'
import { LedgerConnection, LedgerConnectionDetails, LedgerConnectionType } from '../../ledger/connection/LedgerConnection'
import { ReturnCode } from '../../ledger/ReturnCode'
import { isType } from '../../utils/utils'
import { PriceService } from '../price/price.service'
import { LedgerConnectionProvider } from './ledger-connection-provider'
import { TezosLedgerApp } from 'src/app/ledger/app/tezos/TezosLedgerApp'

const MAX_RETRIES = 1

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private readonly supportedApps: Map<string, (connection: LedgerConnection) => LedgerApp> = new Map([
    [MainProtocolSymbols.KUSAMA, (connection: LedgerConnection): LedgerApp => new KusamaLedgerApp(connection)],
    [MainProtocolSymbols.POLKADOT, (connection: LedgerConnection): LedgerApp => new PolkadotLedgerApp(connection)],
    [MainProtocolSymbols.XTZ, (connection: LedgerConnection): LedgerApp => new TezosLedgerApp(connection)]
  ] as [string, (connection: LedgerConnection) => LedgerApp][])

  private readonly openConnections: Map<string, LedgerConnection> = new Map()
  private readonly runningApps: Map<string, LedgerApp> = new Map()

  constructor(
    private readonly platform: Platform,
    private readonly connectionProvider: LedgerConnectionProvider,
    private readonly priceService: PriceService
  ) {}

  public getSupportedProtocols(): string[] {
    return Array.from(this.supportedApps.keys())
  }

  public isProtocolSupported(protocol: ICoinProtocol | ProtocolSymbols): boolean {
    const identifier: ProtocolSymbols = typeof protocol === 'string' ? protocol : protocol.identifier

    return this.getSupportedProtocols().includes(identifier)
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
    return this.withApp(protocolIdentifier, (app: LedgerApp) => app.importWallet(this.priceService), ledgerConnection)
  }

  public async signTransaction(protocolIdentifier: string, transaction: any, ledgerConnection?: LedgerConnectionDetails): Promise<string> {
    return this.withApp(protocolIdentifier, (app: LedgerApp) => app.signTransaction(transaction), ledgerConnection)
  }

  private async withApp<T>(
    identifier: string,
    action: (app: LedgerApp) => Promise<T>,
    ledgerConnection?: LedgerConnectionDetails,
    actionTry: number = 0
  ): Promise<T> {
    const appKey: string = this.getAppKey(identifier, ledgerConnection)

    let app: LedgerApp | undefined = this.runningApps.get(appKey)
    if (!app) {
      app = await this.openLedgerApp(identifier, ledgerConnection)
      app.init()

      this.runningApps.set(appKey, app)
    }

    return action(app)
      .catch(async (error: unknown) => {
        if (this.isDisconnectedDeviceError(error) && actionTry < MAX_RETRIES) {
          await this.closeLedgerConnection(ledgerConnection)

          return this.withApp(identifier, action, ledgerConnection, actionTry + 1)
        } else {
          return Promise.reject(this.getError(error))
        }
      })
      .finally(() => this.closeLedgerConnection(ledgerConnection))
  }

  private async openLedgerConnection(protocolIdentifier: string, ledgerConnection?: LedgerConnectionDetails): Promise<LedgerConnection> {
    const connectionKey: string = this.getConnectionKey(ledgerConnection)

    let connection: LedgerConnection | null
    if (!this.openConnections.has(connectionKey)) {
      connection = await this.connectionProvider.open(protocolIdentifier, ledgerConnection)

      if (connection === null) {
        return Promise.reject(`Platforms ${this.platform.platforms().join(', ')} not supported.`)
      }

      this.openConnections.set(connectionKey, connection)
    } else {
      connection = this.openConnections.get(connectionKey)
    }

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
      try {
        await connection.transport.close()
      } catch (error) {
        console.warn(`Could not close Ledger connection: ${error}`)
      } finally {
        this.openConnections.delete(connectionKey)
        Array.from(this.runningApps.keys())
          .filter((key: string) => key.includes(connectionKey))
          .forEach((key: string) => this.runningApps.delete(key))
      }
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

  private isDisconnectedDeviceError(error: unknown): boolean {
    return (
      isType<{ name: string }>(error, 'name') && (error.name === 'DisconnectedDevice' || error.name === 'DisconnectedDeviceDuringOperation')
    )
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
