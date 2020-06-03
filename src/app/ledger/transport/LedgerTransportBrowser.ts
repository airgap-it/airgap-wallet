import { LedgerTransport, LedgerConnectionType, LedgerConnection } from './LedgerTransport'

export class LedgerTransportBrowser implements LedgerTransport {
  public static async getConnectedDevices(_connectionType: LedgerConnectionType): Promise<LedgerConnection[]> {
    // TODO
    return []
  }

  public static async open(connectionType: LedgerConnectionType, _descriptor: string): Promise<LedgerTransportBrowser> {
    // TODO
    return new LedgerTransportBrowser(connectionType)
  }

  private constructor(readonly connectionType: LedgerConnectionType) {}

  public async send(_cla: number, _ins: number, _p1: number, _p2: number, _data?: Buffer): Promise<Buffer> {
    // TODO
    return Buffer.alloc(0)
  }

  public async close(): Promise<void> {
    // TODO
  }
}
