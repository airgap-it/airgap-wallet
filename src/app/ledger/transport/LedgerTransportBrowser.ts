import { LedgerTransport, LedgerConnectionType, LedgerConnection } from './LedgerTransport'
import Transport from '@ledgerhq/hw-transport'
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'

async function getUsbDevices(): Promise<LedgerConnection[]> {
  const isU2fSupported: boolean = await TransportU2F.isSupported()
  const descriptorsPromise: Promise<readonly string[]> = isU2fSupported ? TransportU2F.list() : TransportWebUSB.list()

  return descriptorsPromise
    .then((descriptors: readonly string[]) => {
      return descriptors.map((descriptor: string) => ({
        descriptor,
        type: LedgerConnectionType.USB
      }))
    })
    .catch(() => [])
}

async function openUsbTransport(descriptor?: string): Promise<Transport> {
  const isU2fSupported: boolean = await TransportU2F.isSupported()
  const isWebUsbSupported: boolean = await TransportWebUSB.isSupported()

  async function openTransport(_descriptor: string): Promise<Transport | null> {
    if (isU2fSupported) {
      return TransportU2F.open(_descriptor)
    } else if (isWebUsbSupported) {
      return TransportWebUSB.open(_descriptor)
    }

    return null
  }

  async function createTransport(timeout: number): Promise<Transport | null> {
    if (isU2fSupported) {
      return TransportU2F.create(timeout, timeout)
    } else if (isWebUsbSupported) {
      return TransportWebUSB.create(timeout, timeout)
    }

    return null
  }

  const transport: Transport | null = await (descriptor ? openTransport(descriptor) : createTransport(3000))

  return transport ? transport : Promise.reject('USB connection not supported.')
}

export class LedgerTransportBrowser implements LedgerTransport {
  public static async getConnectedDevices(connectionType: LedgerConnectionType): Promise<LedgerConnection[]> {
    switch (connectionType) {
      case LedgerConnectionType.USB:
        return getUsbDevices()
      default:
        return []
    }
  }

  public static async open(connectionType?: LedgerConnectionType, descriptor?: string): Promise<LedgerTransportBrowser> {
    let transport: Transport
    switch (connectionType) {
      case LedgerConnectionType.USB:
        transport = await openUsbTransport(descriptor)
        break
      case LedgerConnectionType.BLE:
        return Promise.reject('Web BLE is not supported.')
      default:
        transport = await openUsbTransport()
    }

    return new LedgerTransportBrowser(connectionType, transport)
  }

  private constructor(readonly connectionType: LedgerConnectionType, private readonly transport: Transport) {}

  public async send(cla: number, ins: number, p1: number, p2: number, data?: Buffer): Promise<Buffer> {
    return this.transport.send(cla, ins, p1, p2, data)
  }

  public async close(): Promise<void> {
    return this.transport.close()
  }
}
