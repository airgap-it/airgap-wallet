import { AirGapCoinWallet, AirGapMarketWallet, AirGapWalletPriceService, AirGapWalletStatus } from '@airgap/coinlib-core'
import { RawSubstrateTransaction, SubstrateNetwork, SubstrateProtocol, SubstrateTransaction } from '@airgap/substrate'
import { SubstrateSignatureType } from '@airgap/substrate/v0/protocol/common/data/transaction/SubstrateSignature'
import { SubstrateCompatSignatureType, substrateSignatureFactory } from '@airgap/substrate/v0/protocol/compat/SubstrateCompatSignature'
import { ResponseAddress, ResponseBase, ResponseSign, SubstrateApp } from '@zondax/ledger-substrate'

import { ReturnCode } from '../../ReturnCode'
import { LedgerApp } from '../LedgerApp'

export abstract class SubstrateLedgerApp<Network extends SubstrateNetwork> extends LedgerApp {
  protected abstract readonly protocol: SubstrateProtocol<Network>

  protected abstract getApp(): SubstrateApp

  public async importWallet(priceService: AirGapWalletPriceService): Promise<AirGapMarketWallet> {
    try {
      const derivationPath: number[] = this.derivationPathToArray(this.protocol.standardDerivationPath)
      const [account, change, addressIndex]: number[] = derivationPath.slice(2)

      const app: SubstrateApp = this.getApp()
      const response: ResponseAddress = await app.getAddress(account, change, addressIndex, true)

      return response.return_code === ReturnCode.SUCCESS
        ? new AirGapCoinWallet(
            this.protocol,
            response.pubKey,
            false,
            this.protocol.standardDerivationPath,
            '',
            AirGapWalletStatus.ACTIVE,
            priceService
          )
        : this.rejectWithError('Could not import wallet', response)
    } catch (error) {
      return this.rejectWithError('Could not import wallet', error)
    }
  }

  public async signTransaction(transaction: RawSubstrateTransaction): Promise<string> {
    const txs = this.protocol.options.transactionController.decodeDetails(transaction.encoded)

    const signedTxs: (SubstrateTransaction<Network> | null)[] = []
    for (const tx of txs) {
      signedTxs.push(await this.signSubstrateTransaction(tx.transaction, tx.payload))
    }

    if (signedTxs.some((tx) => tx === null)) {
      return Promise.reject('Rejected')
    }

    txs.forEach((tx, index) => (tx.transaction = signedTxs[index]))

    return this.protocol.options.transactionController.encodeDetails(txs)
  }

  private async signSubstrateTransaction(
    transaction: SubstrateTransaction<Network>,
    payload: string
  ): Promise<SubstrateTransaction<Network> | null> {
    try {
      const derivationPath: number[] = this.derivationPathToArray(this.protocol.standardDerivationPath)
      const [account, change, addressIndex]: number[] = derivationPath.slice(2)

      const app: SubstrateApp = this.getApp()
      const response: ResponseSign = await app.sign(account, change, addressIndex, Buffer.from(payload, 'hex'))

      if (response.return_code === ReturnCode.SUCCESS) {
        const signatureType: SubstrateSignatureType = SubstrateSignatureType[SubstrateSignatureType[response.signature.readUInt8(0)]]
        const signatureBuffer: Buffer = response.signature.slice(1, 65)

        const signature: SubstrateCompatSignatureType[Network] = substrateSignatureFactory(
          this.protocol.options.network.extras.network
        ).create(signatureType, signatureBuffer)

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
