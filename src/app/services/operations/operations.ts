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
import { AirGapDelegateeDetails, AirGapDelegatorDetails, AirGapMainDelegatorAction } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { DelegateeDetails, DelegatorDetails, DelegatorAction } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { UIInputText } from 'src/app/models/widgets/input/UIInputText'

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

  public async getCurrentDelegatees(wallet: AirGapMarketWallet): Promise<string[]> {
    const protocol = wallet.coinProtocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    const current = await protocol.getCurrentDelegateesForAddress(wallet.receivingPublicAddress)
    if (current.length === 0) {
      let defaultDelegatee: string
      if (supportsAirGapDelegation(protocol)) {
        defaultDelegatee = protocol.airGapDelegatee
      }
      return [defaultDelegatee || (await protocol.getDefaultDelegatee())]
    }
    return current
  }

  public async getDelegateeDetails(wallet: AirGapMarketWallet, addresses: string[]): Promise<AirGapDelegateeDetails> {
    const protocol = wallet.coinProtocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

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
      name: '',
      usageDetails: {
        usage: new BigNumber(0),
        current: new BigNumber(0),
        total: new BigNumber(0)
      },
      ...(extra ? extra : {})
    }))
  }

  public async getDelegatorDetails(wallet: AirGapMarketWallet): Promise<AirGapDelegatorDetails> {
    const protocol = wallet.coinProtocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    const promises = []
    promises.push(protocol.getDelegatorDetailsFromAddress(wallet.receivingPublicAddress))
    if (supportsAirGapDelegation(protocol)) {
      promises.push(protocol.getExtraDelegatorDetailsFromAddress(wallet.receivingPublicAddress))
    }

    const allDetails = await Promise.all(promises)

    const basicDetails: DelegatorDetails = allDetails[0]
    const extraDetails: Partial<AirGapDelegatorDetails> = allDetails[1]

    const details = {
      balance: basicDetails.balance,
      isDelegating: basicDetails.isDelegating,
      delegateAction: this.createDefaultMainDelegatorAction(basicDetails.availableActions, ['delegate'], ['delegate', 'delegatee']),
      undelegateAction: this.createDefaultMainDelegatorAction(basicDetails.availableActions, ['undelegate'], ['delegate', 'delegatee']),
      changeDelegateeAction: this.createDefaultMainDelegatorAction(
        basicDetails.availableActions,
        ['change', 'change_baker', 'change_validator'],
        ['delegate', 'delegatee'],
        { availableByDefault: true }
      ),
      displayRewards: basicDetails.rewards
        ? new UIRewardList({
            rewards: basicDetails.rewards.slice(0, 5),
            indexColLabel: 'Index',
            amountColLabel: 'Reward',
            payoutColLabel: 'Payout'
          })
        : undefined,
      ...(extraDetails ? extraDetails : {})
    }

    return details
  }

  private createDefaultMainDelegatorAction(
    availableActions: DelegatorAction[],
    typeKeywords: any[],
    argsKeywords: string[] = [],
    options: { availableByDefault: boolean } = { availableByDefault: false }
  ): AirGapMainDelegatorAction {
    const action = availableActions.find(action => typeKeywords.includes(action.type))
    if (action) {
      const paramName = action.args ? action.args.find(arg => argsKeywords.includes(arg)) : undefined
      return {
        type: action.type,
        isAvailable: true,
        paramName: paramName,
        description: '',
        extraArgs: action.args
          ? action.args.map(
              arg =>
                new UIInputText({
                  id: arg,
                  label: arg
                })
            )
          : undefined
      }
    }

    return {
      isAvailable: options.availableByDefault,
      description: ''
    }
  }

  public async onDelegationDetailsChange(
    wallet: AirGapMarketWallet,
    delegateesDetails: AirGapDelegateeDetails[] | null,
    delegatorDetails: AirGapDelegatorDetails | null
  ): Promise<void> {
    if (supportsAirGapDelegation(wallet.coinProtocol) && delegateesDetails && delegatorDetails) {
      wallet.coinProtocol.onDetailsChange(delegateesDetails.filter(details => !!details), delegatorDetails)
    }
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
      const { isDelegated } = await this.checkDelegated(protocol, address)
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
  public async checkDelegated(protocol: ICoinDelegateProtocol, address: string): Promise<DelegationInfo> {
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
        return {
          isDelegated: false
        }
      }
    }
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
