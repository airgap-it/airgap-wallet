import { LedgerConnection, LedgerConnectionType, LedgerConnectionDetails } from './LedgerConnection'
import Transport from '@ledgerhq/hw-transport'
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'

async function getUsbDevices(): Promise<LedgerConnectionDetails[]> {
  const [isWebUsbSupported, isU2fSupported]: [boolean, boolean] = await Promise.all([
    TransportWebUSB.isSupported(),
    TransportU2F.isSupported()
  ])

  let descriptorsPromise: Promise<readonly string[]>
  if (isWebUsbSupported) {
    descriptorsPromise = TransportWebUSB.list()
  } else if (isU2fSupported) {
    descriptorsPromise = TransportU2F.list()
  } else {
    return []
  }

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
  const [isWebUsbSupported, isU2fSupported]: [boolean, boolean] = await Promise.all([
    TransportWebUSB.isSupported(),
    TransportU2F.isSupported()
  ])

  async function openTransport(_descriptor: string): Promise<Transport | null> {
    if (isWebUsbSupported) {
      return TransportWebUSB.open(_descriptor)
    } else if (isU2fSupported) {
      return TransportU2F.open(_descriptor)
    }

    return null
  }

  async function createTransport(timeout: number): Promise<Transport | null> {
    if (isWebUsbSupported) {
      return TransportWebUSB.create(timeout, timeout * 2)
    } else if (isU2fSupported) {
      return TransportU2F.create(timeout, timeout)
    }

    return null
  }

  const transport: Transport | null = await (descriptor ? openTransport(descriptor) : createTransport(3000))

  return transport ? transport : Promise.reject('USB connection not supported.')
}

export class LedgerConnectionBrowser implements LedgerConnection {
  public static async getConnectedDevices(connectionType: LedgerConnectionType): Promise<LedgerConnectionDetails[]> {
    switch (connectionType) {
      case LedgerConnectionType.USB:
        return getUsbDevices()
      default:
        return []
    }
  }

  public static async open(connectionType?: LedgerConnectionType, descriptor?: string): Promise<LedgerConnectionBrowser> {
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

    return new LedgerConnectionBrowser(connectionType, transport)
  }

  private constructor(readonly type: LedgerConnectionType, readonly transport: Transport) {}
}
