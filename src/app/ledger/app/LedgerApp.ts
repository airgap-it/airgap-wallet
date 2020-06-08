import { AirGapMarketWallet } from 'airgap-coin-lib'
import { IAirGapSignedTransaction } from 'airgap-coin-lib/dist/interfaces/IAirGapSignedTransaction'

import { LedgerConnection } from '../connection/LedgerConnection'

const BYTES_DERIVATION_JUNCTION: number = 4

const MASK_HARD_DERIVATION: number = 0x80000000
const MASK_SOFT_DERIVATION: number = 0x00000000

export abstract class LedgerApp {
  public constructor(protected readonly connection: LedgerConnection) {}

  public init(): void {
    // by default do nothing
  }

  public abstract async importWallet(): Promise<AirGapMarketWallet>
  public abstract async signTransaction(transaction: any): Promise<IAirGapSignedTransaction>

  protected derivationPathToBuffer(derivationPath: string): Buffer {
    const deriveJunctions: number[] = derivationPath
      .split('/')
      .map((junction: string) => {
        const isHard: boolean = !!junction.match(/\d+[\'|h]/)
        const index: number = parseInt(isHard ? junction.slice(0, -1) : junction, 10)
        const mask: number = isHard ? MASK_HARD_DERIVATION : MASK_SOFT_DERIVATION

        if (isNaN(index)) {
          return null
        } else {
          const masked: string = (BigInt(mask) | BigInt(index)).toString()

          return parseInt(masked, 10)
        }
      })
      .filter((index: number | null) => index !== null)

    const buffer: Buffer = Buffer.alloc(deriveJunctions.length * BYTES_DERIVATION_JUNCTION)
    deriveJunctions.forEach((junction: number, index: number) => {
      buffer.writeUInt32LE(junction, index * BYTES_DERIVATION_JUNCTION)
    })

    return buffer
  }
}
