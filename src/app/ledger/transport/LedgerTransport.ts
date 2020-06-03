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

  send(cla: number, ins: number, p1: number, p2: number, data?: Buffer): Promise<Buffer>
  close(): Promise<void>
}
