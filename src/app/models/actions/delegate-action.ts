import { AirGapMarketWallet, EncodedType, IAirGapTransaction, SyncProtocolUtils, TezosKtProtocol, TezosProtocol } from 'airgap-coin-lib'
import { RawAeternityTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/aeternity-transactions.serializer'
import { RawBitcoinTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/bitcoin-transactions.serializer'
import { RawEthereumTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/ethereum-transactions.serializer'
import { RawTezosTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/tezos-transactions.serializer'

import { ProtocolSymbols } from '../../services/protocols/protocols'
import { Action, ActionProgress } from '../Action'

export interface DelegateActionContext<T> {
  wallet: AirGapMarketWallet
  delegate: string
  env: T
}

export interface DelegateActionResult {
  rawTx: RawTezosTransaction
  serializedTx: string
  airGapTx: IAirGapTransaction | void
  dataUrl: string
}

export class DelegateAction<T> extends Action<DelegateActionContext<T>, ActionProgress<void>, DelegateActionResult> {
  public readonly identifier: string = 'tezos-delegate-action'

  public readonly handlerFunction = async (context: DelegateActionContext<T>): Promise<DelegateActionResult> => {
    return new Promise<DelegateActionResult>(
      async (resolve: (context: DelegateActionResult) => void, reject: () => void): Promise<void> => {
        if (context.wallet.protocolIdentifier === ProtocolSymbols.XTZ) {
          const protocol: TezosProtocol = new TezosProtocol()

          try {
            const originateTx: RawTezosTransaction = await protocol.originate(context.wallet.publicKey, context.delegate)
            const serializedTx: string = await this.serializeTx(context.wallet, originateTx)

            const airGapTx: IAirGapTransaction | void = await this.getAirGapTx(context.wallet, originateTx)
            resolve({ rawTx: originateTx, serializedTx, airGapTx, dataUrl: `airgap-vault://?d=${serializedTx}` })
          } finally {
            reject()
          }
        } else {
          const protocol: TezosKtProtocol = new TezosKtProtocol()

          try {
            const delegateTx: RawTezosTransaction = await protocol.delegate(
              context.wallet.publicKey,
              context.wallet.receivingPublicAddress,
              context.delegate
            )
            const serializedTx: string = await this.serializeTx(context.wallet, delegateTx)

            const airGapTx: IAirGapTransaction | void = await this.getAirGapTx(context.wallet, delegateTx)
            resolve({ rawTx: delegateTx, serializedTx, airGapTx, dataUrl: `airgap-vault://?d=${serializedTx}` })
          } finally {
            reject()
          }
        }
      }
    )
  }

  private async serializeTx(
    wallet: AirGapMarketWallet,
    transaction: RawTezosTransaction | RawEthereumTransaction | RawBitcoinTransaction | RawAeternityTransaction
  ): Promise<string> {
    const syncProtocol: SyncProtocolUtils = new SyncProtocolUtils()

    return syncProtocol.serialize({
      version: 1,
      protocol: wallet.coinProtocol.identifier,
      type: EncodedType.UNSIGNED_TRANSACTION,
      payload: {
        publicKey: wallet.publicKey,
        transaction,
        callback: 'airgap-wallet://?d='
      }
    })
  }

  private async getAirGapTx(
    wallet: AirGapMarketWallet,
    transaction: RawTezosTransaction | RawEthereumTransaction | RawBitcoinTransaction | RawAeternityTransaction
  ): Promise<IAirGapTransaction | void> {
    return wallet.coinProtocol.getTransactionDetails({
      publicKey: wallet.publicKey,
      transaction
    })
  }
}
