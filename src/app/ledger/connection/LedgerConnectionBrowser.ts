import { LedgerConnection, LedgerConnectionType, LedgerConnectionDetails } from './LedgerConnection'
import Transport from '@ledgerhq/hw-transport'
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import TransportWebUSB from '@ledgerhq/hw-transport-webusb'

type TransportType = typeof TransportU2F | typeof TransportWebUSB

function getPrioritizedUSBTransportTypes(_protocolIdentifier: string): TransportType[] {
  return [TransportWebUSB, TransportU2F]
}

function getPrioritizedBLETransportTypes(_protocolIdentifier: string): TransportType[] {
  return [TransportU2F]
}

function getPrioritizedTransportTypes(protocolIdentifier: string, connectionType: LedgerConnectionType): TransportType[] {
  switch (connectionType) {
    case LedgerConnectionType.USB:
      return getPrioritizedUSBTransportTypes(protocolIdentifier)
    case LedgerConnectionType.BLE:
      return getPrioritizedBLETransportTypes(protocolIdentifier)
    default:
      return []
  }
}

async function getSupportedTransportType(protocolIdentifier: string, connectionType: LedgerConnectionType): Promise<TransportType | null> {
  const transportTypes: TransportType[] = getPrioritizedTransportTypes(protocolIdentifier, connectionType)
  const areSupported: boolean[] = await Promise.all(transportTypes.map((transport: TransportType) => transport.isSupported()))
  const firstSupportedIndex: number = areSupported.indexOf(true)

  return firstSupportedIndex > -1 ? transportTypes[firstSupportedIndex] : null
}

export class LedgerConnectionBrowser implements LedgerConnection {
  public static async getConnectedDevices(
    protocolIdentifier: string,
    connectionType: LedgerConnectionType
  ): Promise<LedgerConnectionDetails[]> {
    const supportedTransportType: TransportType = await getSupportedTransportType(protocolIdentifier, connectionType)

    return supportedTransportType
      ? supportedTransportType
          .list()
          .then((descriptors: readonly string[]) => {
            return descriptors.map((descriptor: string) => ({
              descriptor,
              type: connectionType
            }))
          })
          .catch(() => [])
      : []
  }

  public static async open(
    protocolIdentifier: string,
    connectionType: LedgerConnectionType = LedgerConnectionType.USB,
    descriptor?: string
  ): Promise<LedgerConnectionBrowser> {
    const supportedTransportType: TransportType = await getSupportedTransportType(protocolIdentifier, connectionType)

    if (supportedTransportType) {
      const transport: Transport = await (descriptor ? supportedTransportType.open(descriptor) : supportedTransportType.create())

      return new LedgerConnectionBrowser(connectionType, transport)
    } else {
      return Promise.reject(`Connection type ${connectionType} is not supported`)
    }
  }

  private constructor(readonly type: LedgerConnectionType, readonly transport: Transport<any>) {}
}
