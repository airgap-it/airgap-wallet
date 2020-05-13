export enum LedgerConnectionType {
  USB = 'USB',
  BLE = 'BLE'
}

export interface LedgerConnection {
  deviceId: string
  type: LedgerConnectionType
}

export abstract class LedgerTransport {
  abstract connectionType: LedgerConnectionType

  abstract async send(cla: number, ins: number, p1: number, p2: number, data?: Buffer): Promise<Buffer>
  abstract async close(): Promise<void>
}
