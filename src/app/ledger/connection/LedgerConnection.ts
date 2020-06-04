import Transport from '@ledgerhq/hw-transport'

export enum LedgerConnectionType {
  USB = 'USB',
  BLE = 'BLE'
}

export interface LedgerConnectionDetails {
  descriptor: string
  type: LedgerConnectionType
}

export interface LedgerConnection {
  type: LedgerConnectionType
  transport: Transport
}
