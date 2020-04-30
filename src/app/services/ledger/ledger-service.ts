import { Injectable } from '@angular/core'

import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import BluetoothTransport from '@ledgerhq/hw-transport-node-ble'

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
  public async getConnectedDevices(): Promise<LedgerConnection[]> {
    const devices = await Promise.all([this.getUsbDevices(), this.getBleDevices()])

    return devices.reduce((flatten, toFlatten) => flatten.concat(toFlatten), [])
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
}
