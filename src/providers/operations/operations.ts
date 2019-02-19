import { Injectable } from '@angular/core'
import { AirGapMarketWallet, TezosKtProtocol, SyncProtocolUtils, EncodedType } from 'airgap-coin-lib'
import { InteractionSelectionPage } from '../../pages/interaction-selection/interaction-selection'
import { RawTezosTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/tezos-transactions.serializer'
import { RawEthereumTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/ethereum-transactions.serializer'
import { RawBitcoinTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/bitcoin-transactions.serializer'
import { RawAeternityTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/aeternity-transactions.serializer'
import { LoadingController, Loading } from 'ionic-angular'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'

@Injectable()
export class OperationsProvider {
  constructor(private readonly loadingController: LoadingController) {}

  public async prepareOriginate(wallet: AirGapMarketWallet) {
    const loader = this.getAndShowLoader()

    const protocol = new TezosKtProtocol()
    const originateTx = await protocol.originate(wallet.publicKey)
    const serializedTx = await this.serializeTx(wallet, originateTx)

    this.hideLoader(loader)

    return this.getPageDetails(wallet, originateTx, serializedTx)
  }

  public async prepareDelegate(wallet: AirGapMarketWallet, sourceAddress: string, delegateTargetAddress?: string) {
    const loader = this.getAndShowLoader()

    const protocol = new TezosKtProtocol()
    const delegateTx = await protocol.delegate(wallet.publicKey, sourceAddress, delegateTargetAddress)
    const serializedTx = await this.serializeTx(wallet, delegateTx)

    this.hideLoader(loader)

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

  public async checkDelegated(
    address: string
  ): Promise<{
    isDelegated: boolean
    setable: boolean
    value?: string
  }> {
    const protocol = new TezosKtProtocol()

    return protocol.isAddressDelegated(address)
  }

  private async getPageDetails(
    wallet: AirGapMarketWallet,
    transaction: RawTezosTransaction | RawEthereumTransaction | RawBitcoinTransaction | RawAeternityTransaction,
    serializedTx: string
  ) {
    let airGapTx

    try {
      airGapTx = await wallet.coinProtocol.getTransactionDetails({
        publicKey: wallet.publicKey,
        transaction: transaction
      })
    } catch (e) {
      console.log('CAUGHT')
      handleErrorSentry(ErrorCategory.COINLIB)(e)
    }

    console.log('output', airGapTx)

    return {
      page: InteractionSelectionPage,
      params: {
        wallet: wallet,
        airGapTx: airGapTx,
        data: 'airgap-vault://?d=' + serializedTx
      }
    }
  }

  private getAndShowLoader() {
    const loader = this.loadingController.create({
      content: 'Preparing transaction...'
    })
    loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

    return loader
  }

  private hideLoader(loader: Loading) {
    loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
  }
}
