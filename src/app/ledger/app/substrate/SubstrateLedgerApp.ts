import { ResponseAddress, ResponseBase, ResponseSign, SubstrateApp } from '@zondax/ledger-polkadot'
import { AirGapMarketWallet, SubstrateProtocol } from 'airgap-coin-lib'
import {
  SubstrateSignature,
  SubstrateSignatureType
} from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateSignature'
import { SubstrateTransaction } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateTransaction'
import { SubstrateTransactionPayload } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/transaction/SubstrateTransactionPayload'
import { RawSubstrateTransaction } from 'airgap-coin-lib/dist/serializer/types'
import { AirGapWalletPriceService } from 'airgap-coin-lib/dist/wallet/AirGapMarketWallet'
import { Buffer } from 'buffer'

import { ReturnCode } from '../../ReturnCode'
import { LedgerApp } from '../LedgerApp'

export abstract class SubstrateLedgerApp extends LedgerApp {
  protected abstract readonly protocol: SubstrateProtocol

  protected abstract getApp(): SubstrateApp

  public async importWallet(priceService: AirGapWalletPriceService): Promise<AirGapMarketWallet> {
    try {
      const derivationPath: number[] = this.derivationPathToArray(this.protocol.standardDerivationPath)
      const [account, change, addressIndex]: number[] = derivationPath.slice(2)

      const app: SubstrateApp = this.getApp()
      const response: ResponseAddress = await app.getAddress(account, change, addressIndex)

      return response.return_code === ReturnCode.SUCCESS
        ? new AirGapMarketWallet(this.protocol, response.pubKey, false, this.protocol.standardDerivationPath, priceService)
        : this.rejectWithError('Could not import wallet', response)
    } catch (error) {
      return this.rejectWithError('Could not import wallet', error)
    }
  }

  public async signTransaction(transaction: RawSubstrateTransaction): Promise<string> {
    const txs = this.protocol.options.transactionController.decodeDetails(transaction.encoded)
    const signed = await Promise.all(txs.map(tx => this.signSubstrateTransaction(tx.transaction, tx.payload)))

    if (signed.some(tx => tx === null)) {
      return Promise.reject('Rejected')
    }

    txs.forEach((tx, index) => (tx.transaction = signed[index]))

    return this.protocol.options.transactionController.encodeDetails(txs)
  }

  private async signSubstrateTransaction(
    transaction: SubstrateTransaction,
    payload: SubstrateTransactionPayload
  ): Promise<SubstrateTransaction | null> {
    try {
      const derivationPath: number[] = this.derivationPathToArray(this.protocol.standardDerivationPath)
      const [account, change, addressIndex]: number[] = derivationPath.slice(2)

      const app: SubstrateApp = this.getApp()
      const response: ResponseSign = await app.sign(account, change, addressIndex, Buffer.from(payload.encode(), 'hex'))

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
