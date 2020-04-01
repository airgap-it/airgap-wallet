import { Injectable } from '@angular/core'
import { LoadingController, ToastController } from '@ionic/angular'
import {
  AirGapMarketWallet,
  CosmosProtocol,
  DelegationInfo,
  IACMessageType,
  IAirGapTransaction,
  TezosKtProtocol,
  ICoinDelegateProtocol
} from 'airgap-coin-lib'
import { CosmosTransaction } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosTransaction'
import {
  RawAeternityTransaction,
  RawBitcoinTransaction,
  RawEthereumTransaction,
  RawTezosTransaction
} from 'airgap-coin-lib/dist/serializer/types'
import BigNumber from 'bignumber.js'
import { BehaviorSubject } from 'rxjs'
import { map } from 'rxjs/operators'

import { AccountProvider } from '../account/account.provider'
import { ProtocolSymbols } from '../protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { SerializerService } from '../serializer/serializer.service'
import { supportsDelegation, supportsAirGapDelegation } from 'src/app/helpers/delegation'
import { AirGapDelegateeDetails, AirGapDelegatorDetails } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIInputText } from 'src/app/models/widgets/UIInputText'
import { isString } from 'util'
import { DelegateeDetails } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'

@Injectable({
  providedIn: 'root'
})
export class OperationsProvider {
  private readonly delegationStatuses: BehaviorSubject<Map<string, boolean>> = new BehaviorSubject(new Map())

  constructor(
    private readonly accountProvider: AccountProvider,
    private readonly loadingController: LoadingController,
    private readonly toastController: ToastController,
    private readonly serializerService: SerializerService
  ) {}

  public async getCurrentDelegatees(protocol: ICoinDelegateProtocol, address: string): Promise<string[]> {
    const current = await protocol.getCurrentDelegateesForAddress(address)
    if (current.length === 0) {
      let defaultDelegatee: string
      if (supportsAirGapDelegation(protocol)) {
        defaultDelegatee = protocol.airGapDelegatee
      }
      return [defaultDelegatee || (await protocol.getDefaultDelegatee())]
    }
    return current
  }

  public async getDelegateeDetails(protocol: ICoinDelegateProtocol, addresses: string[]): Promise<AirGapDelegateeDetails> {
    const promises = []
    promises.push(protocol.getDelegateesDetails(addresses))
    if (supportsAirGapDelegation(protocol)) {
      promises.push(protocol.getExtraDelegateesDetails(addresses))
    }

    const allDetails = await Promise.all(promises)

    const basicDetails = allDetails[0]
    const extraDetails = allDetails[1]

    const zippedDetails = basicDetails.map(
      (basic, index) => [basic, extraDetails ? extraDetails[index] : null] as [DelegateeDetails, Partial<AirGapDelegatorDetails> | null]
    )

    return zippedDetails.map(([basic, extra]: [DelegateeDetails, Partial<AirGapDelegatorDetails> | null]) => ({
      ...basic,
      status: '-',
      usageDetails: {
        usage: new BigNumber(0),
        current: new BigNumber(0),
        total: new BigNumber(0)
      },
      ...(extra ? extra : {})
    }))
  }

  public async getDelegatorDetails(protocol: ICoinDelegateProtocol, address: string): Promise<AirGapDelegatorDetails> {
    const promises = []
    promises.push(protocol.getDelegatorDetailsFromAddress(address))
    if (supportsAirGapDelegation(protocol)) {
      promises.push(protocol.getExtraDelegatorDetailsFromAddress(address))
    }

    const allDetails = await Promise.all(promises)

    const basicDetails = allDetails[0]
    const extraDetails = allDetails[1]

    const details = {
      balance: basicDetails.balance,
      isDelegating: basicDetails.isDelegating,
      delegateAction: { isAvailable: false },
      undelegateAction: { isAvailable: false },
      extraActions: basicDetails.availableActions
        .map(action =>
          isString(action)
            ? new UIInputText({
                id: action,
                inputType: 'string',
                label: action
              })
            : null
        )
        .filter(widget => widget !== null),
      ...(extraDetails ? extraDetails : {})
    }

    return details
  }

  public async prepareDelegatorAction(
    wallet: AirGapMarketWallet,
    type: any,
    data?: any
  ): Promise<{ airGapTxs: IAirGapTransaction[]; serializedTxChunks: string[] }> {
    let airGapTxs = []
    let serializedTxChunks = []
    if (supportsDelegation(wallet.coinProtocol)) {
      const rawUnsignedTx = (await wallet.coinProtocol.prepareDelegatorActionFromPublicKey(wallet.publicKey, type, data))[0]

      airGapTxs = await wallet.coinProtocol.getTransactionDetails({
        publicKey: wallet.publicKey,
        transaction: rawUnsignedTx
      })

      serializedTxChunks = await this.serializeTx(wallet, rawUnsignedTx)
    }

    return { airGapTxs, serializedTxChunks }
  }

  public setDelegationStatusOfAddress(address: string, delegated: boolean) {
    this.delegationStatuses.next(this.delegationStatuses.getValue().set(address, delegated))
  }

  public async getDelegationStatusOfAddress(protocol: ICoinDelegateProtocol, address: string, refresh: boolean = false) {
    const delegationStatus = this.delegationStatuses.getValue().get(address)
    if (refresh || delegationStatus === undefined) {
      const { isDelegated } = await this.checkDelegated(protocol, address, false)
      this.setDelegationStatusOfAddress(address, isDelegated)

      return isDelegated
    } else {
      return delegationStatus
    }
  }

  public async getDelegationStatusObservableOfAddress(protocol: ICoinDelegateProtocol, address: string) {
    await this.getDelegationStatusOfAddress(protocol, address)

    return this.delegationStatuses.pipe(map(delegationStatuses => delegationStatuses.get(address)))
  }

  public refreshAllDelegationStatuses(wallets: AirGapMarketWallet[]) {
    Array.from(this.delegationStatuses.getValue().entries()).forEach(entry => {
      const address = entry[0]
      const wallet = wallets.find(wallet => wallet.receivingPublicAddress === address && supportsDelegation(wallet.coinProtocol))
      if (wallet) {
        this.getDelegationStatusOfAddress(wallet.coinProtocol as ICoinDelegateProtocol, address, true).catch(
          handleErrorSentry(ErrorCategory.OPERATIONS_PROVIDER)
        )
      }
    })
  }

  public async serializeTx(
    wallet: AirGapMarketWallet,
    transaction: RawTezosTransaction | RawEthereumTransaction | RawBitcoinTransaction | RawAeternityTransaction | CosmosTransaction
  ): Promise<string[]> {
    return this.serializerService.serialize([
      {
        protocol: wallet.coinProtocol.identifier,
        type: IACMessageType.TransactionSignRequest,
        payload: {
          publicKey: wallet.publicKey,
          transaction: transaction as any, // TODO: Type
          callback: 'airgap-wallet://?d='
        }
      }
    ])
  }

  // TODO: change returned type when generic protocol is done
  public async checkDelegated(protocol: ICoinDelegateProtocol, address: string, fetchExtraInfo: boolean): Promise<DelegationInfo> {
    if (supportsDelegation(protocol)) {
      return {
        isDelegated: await protocol.isAddressDelegating(address)
      }
    } else {
      // TODO: remove if/else when generic protocol is done and implemented by the protocols
      if (address && address.startsWith('cosmos')) {
        const protocol = new CosmosProtocol()
        const delegations = await protocol.fetchDelegations(address)

        return {
          isDelegated: delegations.length > 0 ? true : false
        }
      } else {
        return this.fetchDelegationInfo(address, fetchExtraInfo)
      }
    }
  }
  public async fetchDelegationInfo(address: string, fetchExtraInfo: boolean): Promise<DelegationInfo> {
    const protocol = new TezosKtProtocol()

    return protocol.isAddressDelegated(address, fetchExtraInfo)
  }

  public async prepareTransaction(
    wallet: AirGapMarketWallet,
    address: string,
    amount: BigNumber,
    fee: BigNumber,
    data?: any
  ): Promise<{ airGapTxs: IAirGapTransaction[]; serializedTxChunks: string[] }> {
    const loader = await this.getAndShowLoader()

    try {
      let rawUnsignedTx
      // TODO: This is an UnsignedTransaction, not an IAirGapTransaction
      if (wallet.coinProtocol.identifier === ProtocolSymbols.XTZ_KT) {
        const tezosKtProtocol = new TezosKtProtocol()
        rawUnsignedTx = await tezosKtProtocol.migrateKtContract(wallet.publicKey, wallet.receivingPublicAddress) // TODO change this
      } else {
        rawUnsignedTx = await wallet.prepareTransaction([address], [amount.toString(10)], fee.toString(10), data)
      }

      const airGapTxs = await wallet.coinProtocol.getTransactionDetails({
        publicKey: wallet.publicKey,
        transaction: rawUnsignedTx
      })

      const serializedTxChunks: string[] = await this.serializeTx(wallet, rawUnsignedTx)

      return { airGapTxs, serializedTxChunks }
    } catch (error) {
      handleErrorSentry(ErrorCategory.COINLIB)(error)

      this.toastController
        .create({
          message: error.message,
          duration: 3000,
          position: 'bottom'
        })
        .then(toast => {
          toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
        })
      throw error
    } finally {
      this.hideLoader(loader)
    }
  }

  public async addKtAddress(xtzWallet: AirGapMarketWallet, index: number, ktAddresses: string[]): Promise<AirGapMarketWallet> {
    let wallet = this.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(xtzWallet.publicKey, ProtocolSymbols.XTZ_KT, index)

    if (wallet) {
      return wallet
    }

    wallet = new AirGapMarketWallet(
      ProtocolSymbols.XTZ_KT,
      xtzWallet.publicKey,
      xtzWallet.isExtendedPublicKey,
      xtzWallet.derivationPath,
      index
    )
    wallet.addresses = ktAddresses
    await wallet.synchronize().catch(handleErrorSentry(ErrorCategory.COINLIB))
    await this.accountProvider.addWallet(wallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))

    return wallet
  }

  private async getAndShowLoader() {
    const loader = await this.loadingController.create({
      message: 'Preparing transaction...'
    })

    await loader.present().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))

    return loader
  }

  private hideLoader(loader: HTMLIonLoadingElement) {
    loader.dismiss().catch(handleErrorSentry(ErrorCategory.IONIC_LOADER))
  }
}
