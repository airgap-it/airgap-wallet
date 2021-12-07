import {
  AirGapCoinWallet,
  AirGapMarketWallet,
  AirGapWalletPriceService,
  AirGapWalletStatus,
  RawTezosTransaction,
  TezosProtocol
} from '@airgap/coinlib-core'
import Tezos from '@obsidiansystems/hw-app-xtz'

import { LedgerApp } from '../LedgerApp'

export class TezosLedgerApp extends LedgerApp {
  private readonly protocol: TezosProtocol = new TezosProtocol()
  private readonly derivationPath: string = this.protocol.standardDerivationPath.slice(2).replace(/h/g, "'")

  public async importWallet(priceService: AirGapWalletPriceService): Promise<AirGapMarketWallet> {
    const app = new Tezos(this.connection.transport)
    const result: Record<'publicKey', string> = await app.getAddress(this.derivationPath, true)

    return new AirGapCoinWallet(
      this.protocol,
      result.publicKey.slice(2),
      false,
      this.protocol.standardDerivationPath,
      '',
      AirGapWalletStatus.ACTIVE,
      priceService
    )
  }

  public async signTransaction(transaction: RawTezosTransaction): Promise<string> {
    const app = new Tezos(this.connection.transport)

    const watermark: string = '03'
    const result: Record<'signature', string> = await app.signOperation(
      this.derivationPath,
      Buffer.from(watermark + transaction.binaryTransaction, 'hex')
    )

    return transaction.binaryTransaction + result.signature
  }
}
