import { LedgerTransport, LedgerConnection, LedgerConnectionType } from './LedgerTransport'
import { LedgerElectronBridge, LedgerProcessMessageType } from './bridge/LedgerElectronBridge'

export class LedgerTransportElectron extends LedgerTransport {
  private static get bridge() {
    return LedgerElectronBridge.getInstance()
  }

  public static async getConnectedDevices(connectionType: LedgerConnectionType): Promise<LedgerConnection[]> {
    const { devices } = await LedgerTransportElectron.bridge.sendToLedger(
      LedgerProcessMessageType.GET_DEVICES,
      {
        connectionType
      },
      connectionType
    )

    return devices
  }

  public static async open(connectionType: LedgerConnectionType, descriptor: string): Promise<LedgerTransportElectron> {
    const { transportId } = await LedgerTransportElectron.bridge.sendToLedger(
      LedgerProcessMessageType.OPEN,
      {
        connectionType,
        descriptor
      },
      `${connectionType}_${descriptor}`
    )
    return new LedgerTransportElectron(connectionType, transportId)
  }

  private constructor(readonly connectionType: LedgerConnectionType, private readonly transportId: string) {
    super()
  }

  public async send(cla: number, ins: number, p1: number, p2: number, data?: Buffer): Promise<Buffer> {
    const { response } = await LedgerTransportElectron.bridge.sendToLedger(
      LedgerProcessMessageType.SEND,
      {
        transportId: this.transportId,
        cla,
        ins,
        p1,
        p2,
        data
      },
      `${this.transportId}_${cla}_${ins}_${new Date().getTime().toString()}`
    )
    return response
  }
  public async close(): Promise<void> {
    await LedgerTransportElectron.bridge.sendToLedger(
      LedgerProcessMessageType.CLOSE,
      {
        transportId: this.transportId
      },
      this.transportId
    )
  }
}
