import { Injectable } from '@angular/core'
import { AirGapMarketWallet, TezosKtProtocol, SyncProtocolUtils, EncodedType, DelegationInfo } from 'airgap-coin-lib'
import { InteractionSelectionPage } from '../../pages/interaction-selection/interaction-selection'
import { RawTezosTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/tezos-transactions.serializer'
import { RawEthereumTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/ethereum-transactions.serializer'
import { RawBitcoinTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/bitcoin-transactions.serializer'
import { RawAeternityTransaction } from 'airgap-coin-lib/dist/serializer/unsigned-transactions/aeternity-transactions.serializer'
import { LoadingController, Loading } from 'ionic-angular'
import { handleErrorSentry, ErrorCategory } from '../sentry-error-handler/sentry-error-handler'
import { BehaviorSubject } from 'rxjs'
import { map } from 'rxjs/operators'

@Injectable()
export class OperationsProvider {
  private delegationStatuses: BehaviorSubject<Map<string, boolean>> = new BehaviorSubject(new Map())

  public setDelegationStatusOfAddress(address: string, delegated: boolean) {
    this.delegationStatuses.next(this.delegationStatuses.getValue().set(address, delegated))
  }

  public async getDelegationStatusOfAddress(address: string, refresh: boolean = false) {
    const delegationStatus = this.delegationStatuses.getValue().get(address)
    if (refresh || delegationStatus === undefined) {
      const { isDelegated } = await this.checkDelegated(address)
      this.setDelegationStatusOfAddress(address, isDelegated)
      return isDelegated
    } else {
      return delegationStatus
    }
  }

  public async getDelegationStatusObservableOfAddress(address) {
    await this.getDelegationStatusOfAddress(address)
    return this.delegationStatuses.pipe(map(delegationStatuses => delegationStatuses.get(address)))
  }

  public refreshAllDelegationStatuses() {
    Array.from(this.delegationStatuses.getValue().entries()).forEach(entry => {
      this.getDelegationStatusOfAddress(entry[0], true).catch(handleErrorSentry(ErrorCategory.OPERATIONS_PROVIDER))
    })
  }

  constructor(private readonly loadingController: LoadingController) {}

  public async prepareOriginate(wallet: AirGapMarketWallet) {
    const loader = this.getAndShowLoader()

    const protocol = new TezosKtProtocol()

    try {
      const originateTx = await protocol.originate(wallet.publicKey)
      const serializedTx = await this.serializeTx(wallet, originateTx)
      return this.getPageDetails(wallet, originateTx, serializedTx)
    } finally {
      this.hideLoader(loader)
    }
  }

  public async prepareDelegate(wallet: AirGapMarketWallet, delegateTargetAddress?: string) {
    const loader = this.getAndShowLoader()

    const protocol = new TezosKtProtocol()

    try {
      const delegateTx = await protocol.delegate(wallet.publicKey, wallet.receivingPublicAddress, delegateTargetAddress)
      const serializedTx = await this.serializeTx(wallet, delegateTx)
      return this.getPageDetails(wallet, delegateTx, serializedTx)
    } finally {
      this.hideLoader(loader)
    }
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

  public async checkDelegated(address: string): Promise<DelegationInfo> {
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
