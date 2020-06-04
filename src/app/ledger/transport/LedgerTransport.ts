import Transport from '@ledgerhq/hw-transport'

export enum LedgerConnectionType {
  USB = 'USB',
  BLE = 'BLE'
}

export interface LedgerConnection {
  descriptor: string
  type: LedgerConnectionType
}

export interface LedgerTransport {
  connectionType: LedgerConnectionType
  hwTransport: Transport
}
