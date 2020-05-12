export enum LedgerConnectionType {
  USB,
  BLE
}

export interface LedgerConnection {
  id: string
  connectionType: LedgerConnectionType
}
