import { ICoinProtocolAdapter } from '@airgap/angular-core'
import { AirGapCoinWallet, AirGapMarketWallet, AirGapWalletPriceService, AirGapWalletStatus } from '@airgap/coinlib-core'
import {
  SubstrateProtocol,
  SubstrateProtocolConfiguration,
  SubstrateSignature,
  SubstrateSignatureType,
  SubstrateTransaction,
  SubstrateTransactionSignRequest
} from '@airgap/substrate'
import { ResponseAddress, ResponseBase, ResponseSign, SubstrateApp } from '@zondax/ledger-substrate'

import { ReturnCode } from '../../ReturnCode'
import { LedgerApp } from '../LedgerApp'

export abstract class SubstrateLedgerApp<C extends SubstrateProtocolConfiguration> extends LedgerApp {
  protected abstract createProtocol(): Promise<ICoinProtocolAdapter<SubstrateProtocol<C>>>
  protected abstract getApp(): SubstrateApp

  private _adapter: ICoinProtocolAdapter<SubstrateProtocol<C>> | undefined
  private async adapter(): Promise<ICoinProtocolAdapter<SubstrateProtocol<C>>> {
    if (this._adapter === undefined) {
      this._adapter = await this.createProtocol()
    }

    return this._adapter
  }

  public async importWallet(priceService: AirGapWalletPriceService): Promise<AirGapMarketWallet> {
    try {
      const adapter: ICoinProtocolAdapter<SubstrateProtocol<C>> = await this.adapter()
      const derivationPath: number[] = this.derivationPathToArray(adapter.standardDerivationPath)
      const [account, change, addressIndex]: number[] = derivationPath.slice(2)

      const app: SubstrateApp = this.getApp()
      const response: ResponseAddress = await app.getAddress(account, change, addressIndex, true)

      return response.return_code === ReturnCode.SUCCESS
        ? new AirGapCoinWallet(adapter, response.pubKey, false, adapter.standardDerivationPath, '', AirGapWalletStatus.ACTIVE, priceService)
        : this.rejectWithError('Could not import wallet', response)
    } catch (error) {
      return this.rejectWithError('Could not import wallet', error)
    }
  }

  public async signTransaction(transaction: SubstrateTransactionSignRequest['transaction']): Promise<string> {
    const adapter: ICoinProtocolAdapter<SubstrateProtocol<C>> = await this.adapter()
    const txs = await adapter.protocolV1.decodeDetails(transaction.encoded)

    const signedTxs: (SubstrateTransaction<C> | null)[] = []
    for (const tx of txs) {
      signedTxs.push(await this.signSubstrateTransaction(tx.transaction, tx.payload))
    }

    if (signedTxs.some((tx) => tx === null)) {
      return Promise.reject('Rejected')
    }

    txs.forEach((tx, index) => (tx.transaction = signedTxs[index]))

    return adapter.protocolV1.encodeDetails(txs)
  }

  private async signSubstrateTransaction(transaction: SubstrateTransaction<C>, payload: string): Promise<SubstrateTransaction<C> | null> {
    try {
      const adapter: ICoinProtocolAdapter<SubstrateProtocol<C>> = await this.adapter()
      const derivationPath: number[] = this.derivationPathToArray(adapter.standardDerivationPath)
      const [account, change, addressIndex]: number[] = derivationPath.slice(2)

      const app: SubstrateApp = this.getApp()
      const response: ResponseSign = await app.sign(account, change, addressIndex, Buffer.from(payload, 'hex'))

      if (response.return_code === ReturnCode.SUCCESS) {
        const signatureType: SubstrateSignatureType = SubstrateSignatureType[SubstrateSignatureType[response.signature.readUInt8(0)]]
        const signatureBuffer: Buffer = response.signature.slice(1, 65)
        const signature: SubstrateSignature = SubstrateSignature.create(signatureType, signatureBuffer)

        return SubstrateTransaction.fromTransaction(transaction, { signature })
      } else if (
        response.return_code === ReturnCode.COMMAND_NOT_ALLOWED ||
        response.error_message.includes(ReturnCode.COMMAND_NOT_ALLOWED.toString(16)) // workaround until return codes are fixed in the substrate app lib
      ) {
        // thrown when sign rejected
        return null
      } else {
        return this.rejectWithError('Could not sign transaction', response)
      }
    } catch (error) {
      return this.rejectWithError('Could not sign transaction', error)
    }
  }

  private async rejectWithError<T>(header: string, error: string | Error | ResponseBase): Promise<T> {
    return Promise.reject(
      typeof error === 'string' || error instanceof Error
        ? `${header}, ${error}`
        : `${header}, ${error.error_message} (code 0x${error.return_code.toString(16).toLocaleUpperCase()})`
    )
  }
}
