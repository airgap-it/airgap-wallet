import { Injectable } from '@angular/core'
import { AirGapMarketWallet, TezosKtProtocol, SyncProtocolUtils, EncodedType } from 'airgap-coin-lib'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'
import { InteractionSelectionPage } from '../../pages/interaction-selection/interaction-selection'
import { RawTezosTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/tezos-transactions.serializer'
import { RawEthereumTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/ethereum-transactions.serializer'
import { RawBitcoinTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/bitcoin-transactions.serializer'
import { RawAeternityTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/aeternity-transactions.serializer'
import { LoadingController, Loading } from 'ionic-angular'

@Injectable()
export class OperationsProvider {
  private loader: Loading

  constructor(private readonly loadingController: LoadingController) {
    this.loader = this.loadingController.create({
      content: 'Preparing transaction...'
    })
  }

  public async prepareOriginate(wallet: AirGapMarketWallet) {
    this.showLoader()

    const protocol = new TezosKtProtocol()
    const originateTx = await protocol.originate(wallet.publicKey)
    const serializedTx = await this.serializeTx(wallet, originateTx)

    this.hideLoader()

    return this.getPageDetails(wallet, originateTx, serializedTx)
  }

  public async prepareDelegate(wallet: AirGapMarketWallet, delegateTarget: string) {
    this.showLoader()

    const protocol = new TezosKtProtocol()
    const delegateTx = await protocol.delegate(wallet.publicKey, delegateTarget)
    const serializedTx = await this.serializeTx(wallet, delegateTx)

    this.hideLoader()

    return this.getPageDetails(wallet, delegateTx, serializedTx)
  }

  private async serializeTx(
    wallet: AirGapMarketWallet,
    transaction: RawTezosTransaction | RawEthereumTransaction | RawBitcoinTransaction | RawAeternityTransaction
  ) {
    const syncProtocol = new SyncProtocolUtils()
    return syncProtocol.serialize({
      version: 1,
      protocol: wallet.coinProtocol.identifier,
      type: EncodedType.UNSIGNED_TRANSACTION,
      payload: {
        publicKey: wallet.publicKey,
        transaction: transaction,
        callback: 'airgap-wallet://?d='
      }
    })
  }

  private async getPageDetails(wallet, transaction, serializedTx) {
    return {
      page: InteractionSelectionPage,
      params: {
        wallet: wallet,
        airGapTx: transaction,
        data: 'airgap-vault://?d=' + serializedTx
      }
    }
  }

  private showLoader() {
    this.loader.present()
  }

  private hideLoader() {
    this.loader.dismiss()
  }
}
