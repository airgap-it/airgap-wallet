import { AirGapMarketWallet } from 'airgap-coin-lib'
import { IAirGapSignedTransaction } from 'airgap-coin-lib/dist/interfaces/IAirGapSignedTransaction'
import { ProtocolSymbols } from '../services/protocols/protocols'

import Transport from '@ledgerhq/hw-transport'

export abstract class LedgerApp {
  public abstract appIdentifier: number
  public abstract protocolIdentifier: ProtocolSymbols

  public constructor(protected readonly transport: Transport) {}

  public abstract async isAvailable(): Promise<boolean>
  public abstract async importWallet(): Promise<AirGapMarketWallet>
  public abstract async signTranscation(transaction: any): Promise<IAirGapSignedTransaction>

  protected createPayload(data: null | Buffer | Uint8Array): Buffer {
    const payloadLength = Buffer.alloc(1)
    if (data === null) {
      return Buffer.from([0])
    } else {
      payloadLength.writeUInt8(data.length, 0)
      return Buffer.concat([payloadLength, data])
    }
  }

  protected derivationPathToBuffer(derivationPath: string): Buffer {
    const deriveJunctions = derivationPath
      .split('/')
      .map(junction => junction.replace(/\'|h/, ''))
      .map(junction => parseInt(junction))

    return Buffer.from(deriveJunctions)
  }
}
