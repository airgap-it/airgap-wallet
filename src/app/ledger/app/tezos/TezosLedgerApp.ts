import { createV0TezosProtocol, ICoinProtocolAdapter } from '@airgap/angular-core'
import { AirGapCoinWallet, AirGapMarketWallet, AirGapWalletPriceService, AirGapWalletStatus } from '@airgap/coinlib-core'
import { TezosProtocol, TezosTransactionSignRequest } from '@airgap/tezos'
import Tezos from '@obsidiansystems/hw-app-xtz'

import { LedgerApp } from '../LedgerApp'

export class TezosLedgerApp extends LedgerApp {
  private _adapter: ICoinProtocolAdapter<TezosProtocol> | undefined
  private async adapter(): Promise<ICoinProtocolAdapter<TezosProtocol>> {
    if (this._adapter === undefined) {
      this._adapter = await createV0TezosProtocol()
    }

    return this._adapter
  }

  private _derivationPath: string | undefined
  private async derivationPath(): Promise<string> {
    if (this._derivationPath === undefined) {
      const protocol: ICoinProtocolAdapter<TezosProtocol> = await this.adapter()
      this._derivationPath = protocol.standardDerivationPath.slice(2).replace(/h/g, "'")
    }

    return this._derivationPath
  }

  public async importWallet(priceService: AirGapWalletPriceService): Promise<AirGapMarketWallet> {
    const adapter: ICoinProtocolAdapter<TezosProtocol> = await this.adapter()
    const app = new Tezos(this.connection.transport)
    const result: Record<'publicKey', string> = await app.getAddress(await this.derivationPath(), true)

    return new AirGapCoinWallet(
      adapter,
      result.publicKey.slice(2),
      false,
      adapter.standardDerivationPath,
      '',
      AirGapWalletStatus.ACTIVE,
      priceService
    )
  }

  public async signTransaction(transaction: TezosTransactionSignRequest['transaction']): Promise<string> {
    const app = new Tezos(this.connection.transport)

    const watermark: string = '03'
    const result: Record<'signature', string> = await app.signOperation(
      await this.derivationPath(),
      Buffer.from(watermark + transaction.binaryTransaction, 'hex')
    )

    return transaction.binaryTransaction + result.signature
  }
}
