import { AirGapMarketWallet, AirGapWalletPriceService, IAirGapSignedTransaction } from '@airgap/coinlib-core'

import { LedgerConnection } from '../connection/LedgerConnection'

const BYTES_DERIVATION_JUNCTION: number = 4

const MASK_HARD_DERIVATION: number = 0x80000000
const MASK_SOFT_DERIVATION: number = 0x00000000

export abstract class LedgerApp {
  public constructor(protected readonly connection: LedgerConnection) {}

  public init(): void {
    // by default do nothing
  }

  public abstract importWallet(priceService: AirGapWalletPriceService): Promise<AirGapMarketWallet>
  public abstract signTransaction(transaction: any): Promise<IAirGapSignedTransaction>

  protected derivationPathToArray(derivationPath: string): number[] {
    if (!derivationPath.startsWith('m/')) {
      throw new Error('Invalid derivation path: the path should start with `m/`')
    }

    return derivationPath
      .split('/')
      .slice(1) // ignore the `m` prefix
      .map((junction: string) => {
        const isHard: boolean = !!junction.match(/\d+[\'|h]/)

        const indexRaw: string = isHard ? junction.slice(0, -1) : junction
        const index: number = parseInt(indexRaw, 10)

        if (isNaN(index)) {
          throw new Error(`Invalid derivation path: index ${indexRaw} is not a number`)
        } else {
          const mask: number = isHard ? MASK_HARD_DERIVATION : MASK_SOFT_DERIVATION
          const masked: string = (BigInt(mask) | BigInt(index)).toString()

          return parseInt(masked, 10)
        }
      })
  }

  protected derivationPathToBuffer(derivationPath: string): Buffer {
    const deriveJunctions: number[] = this.derivationPathToArray(derivationPath)

    const buffer: Buffer = Buffer.alloc(deriveJunctions.length * BYTES_DERIVATION_JUNCTION)
    deriveJunctions.forEach((junction: number, index: number) => {
      buffer.writeUInt32LE(junction, index * BYTES_DERIVATION_JUNCTION)
    })

    return buffer
  }
}
