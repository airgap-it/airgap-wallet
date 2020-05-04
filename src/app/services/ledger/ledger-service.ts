import { Injectable } from '@angular/core'

import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import BluetoothTransport from '@ledgerhq/hw-transport-node-ble'
import { ProtocolSymbols } from '../protocols/protocols'
import Transport from '@ledgerhq/hw-transport'
import { LedgerApp } from 'src/app/ledger-apps/LedgerApp'
import { KusamaLedgerApp } from 'src/app/ledger-apps/substrate/KusamaLedgerApp'
import { PolkadotLedgerApp } from 'src/app/ledger-apps/substrate/PolkadotLedgerApp'
import { AirGapMarketWallet } from 'airgap-coin-lib'

export enum LedgerConnectionType {
  USB,
  BLE
}

export interface LedgerConnection {
  id: string
  connectionType: LedgerConnectionType
}

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  public readonly supportedApps: Map<ProtocolSymbols, (transport: Transport) => LedgerApp> = new Map([
    [ProtocolSymbols.KUSAMA, (transport: Transport) => new KusamaLedgerApp(transport)],
    [ProtocolSymbols.POLKADOT, (transport: Transport) => new PolkadotLedgerApp(transport)]
  ] as [ProtocolSymbols, (transport: Transport) => LedgerApp][])

  public async getConnectedDevices(): Promise<LedgerConnection[]> {
    const devices = await Promise.all([this.getUsbDevices(), this.getBleDevices()])

    return devices.reduce((flatten, toFlatten) => flatten.concat(toFlatten), [])
  }

  public async importWallet(identifier: ProtocolSymbols, ledgerConnection: LedgerConnection): Promise<AirGapMarketWallet> {
    return this.openApp(identifier, ledgerConnection, app => app.importWallet())
  }

  public async signTransaction(identifier: ProtocolSymbols, ledgerConnection: LedgerConnection, transaction: any): Promise<string> {
    return this.openApp(identifier, ledgerConnection, app => app.signTranscation(transaction))
  }

  private async getUsbDevices(): Promise<LedgerConnection[]> {
    return TransportNodeHid.list()
      .then(descriptors =>
        descriptors.map(descriptor => ({
          id: descriptor,
          connectionType: LedgerConnectionType.USB
        }))
      )
      .catch(() => [])
  }

  private async getBleDevices(): Promise<LedgerConnection[]> {
    return new Promise(resolve => {
      const devices = []
      BluetoothTransport.listen({
        next: event => {
          if (event.type === 'add') {
            devices.push({
              id: event.descriptor,
              connectionType: LedgerConnectionType.BLE
            })
          }
        },
        error: () => resolve([]),
        complete: () => resolve(devices)
      })
    })
  }

  private async openApp<T>(
    identifier: ProtocolSymbols,
    ledgerConnection: LedgerConnection,
    action: (app: LedgerApp) => Promise<T>
  ): Promise<T> {
    const appFactory: (transport: Transport) => LedgerApp = this.supportedApps[identifier]

    if (appFactory) {
      const transport = await this.connectWithDevice(ledgerConnection)
      const app = appFactory(transport)

      return action(app).finally(() => transport.close())
    } else {
      return Promise.reject('Protocol app is not supported')
    }
  }

  private async connectWithDevice(ledgerConnection: LedgerConnection): Promise<Transport> {
    switch (ledgerConnection.connectionType) {
      case LedgerConnectionType.USB:
        return TransportNodeHid.open(ledgerConnection.id)
      case LedgerConnectionType.BLE:
        return BluetoothTransport.open(ledgerConnection.id)
    }
  }
}
