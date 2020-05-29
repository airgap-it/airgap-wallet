import { TezosBTC } from 'airgap-coin-lib/dist/protocols/tezos/fa/TezosBTC'
import { Injectable } from '@angular/core'
import { LoadingController, ToastController } from '@ionic/angular'
import { AirGapMarketWallet, IACMessageType, IAirGapTransaction, TezosKtProtocol, ICoinDelegateProtocol } from 'airgap-coin-lib'
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

import { ProtocolSymbols } from '../protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { SerializerService } from '../serializer/serializer.service'
import { supportsDelegation, supportsAirGapDelegation } from 'src/app/helpers/delegation'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { DelegatorAction, DelegatorDetails, DelegateeDetails } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { UIInputText } from 'src/app/models/widgets/input/UIInputText'
import { FormBuilder } from '@angular/forms'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { UIAccountExtendedDetails } from 'src/app/models/widgets/display/UIAccountExtendedDetails'
import { FeeDefaults } from 'airgap-coin-lib/dist/protocols/ICoinProtocol'

@Injectable({
  providedIn: 'root'
})
export class OperationsProvider {
  private readonly delegationStatuses: BehaviorSubject<Map<string, boolean>> = new BehaviorSubject(new Map())

  constructor(
    private readonly loadingController: LoadingController,
    private readonly toastController: ToastController,
    private readonly serializerService: SerializerService,
    private readonly formBuilder: FormBuilder
  ) {}

  public async getDelegateesSummary(wallet: AirGapMarketWallet, delegatees: string[]): Promise<UIAccountSummary[]> {
    const protocol = wallet.coinProtocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    if (supportsAirGapDelegation(protocol)) {
      return protocol.createDelegateesSummary(delegatees)
    } else {
      const delegateesDetails = await Promise.all(delegatees.map(delegatee => protocol.getDelegateeDetails(delegatee)))
      return delegateesDetails.map(
        details =>
          new UIAccountSummary({
            address: details.address,
            header: [details.name, ''],
            description: [details.address, '']
          })
      )
    }
  }

  public async getAccountExtendedDetails(wallet: AirGapMarketWallet): Promise<UIAccountExtendedDetails> {
    const protocol = wallet.coinProtocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    if (supportsAirGapDelegation(protocol)) {
      return protocol.createAccountExtendedDetails(wallet.receivingPublicAddress)
    } else {
      return new UIAccountExtendedDetails({ items: [] })
    }
  }

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

  public async getDelegatorDetails(wallet: AirGapMarketWallet): Promise<DelegatorDetails> {
    const protocol = wallet.coinProtocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    return protocol.getDelegatorDetailsFromAddress(wallet.receivingPublicAddress)
  }

  public async getDelegationDetails(wallet: AirGapMarketWallet, delegatees: string[]): Promise<AirGapDelegationDetails[]> {
    const protocol = wallet.coinProtocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    return supportsAirGapDelegation(protocol)
      ? protocol.getExtraDelegationDetailsFromAddress(wallet.receivingPublicAddress, delegatees)
      : [await this.getDefaultDelegationDetails(protocol, wallet.receivingPublicAddress, delegatees)]
  }

  private async getDefaultDelegationDetails(
    protocol: ICoinDelegateProtocol,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails> {
    const details = await protocol.getDelegationDetailsFromAddress(delegator, delegatees)

    const [delegatorDetails, delegateesDetails] = await Promise.all([
      this.getDefaultDelegatorDetails(details.delegator, delegatees),
      this.getDefaultDelegateesDetails(details.delegatees)
    ])

    return {
      delegator: delegatorDetails,
      delegatees: delegateesDetails
    }
  }

  private async getDefaultDelegateesDetails(delegateesDetails: DelegateeDetails[]): Promise<AirGapDelegateeDetails[]> {
    return delegateesDetails.map(details => ({
      name: '',
      ...details
    }))
  }

  private async getDefaultDelegatorDetails(delegatorDetails: DelegatorDetails, delegatees: string[]): Promise<AirGapDelegatorDetails> {
    const defaultDelegateActionTypeKeywords = ['delegate']
    const defaultUndelegateActionTypeKeywords = ['undelegate']

    const defaultMainParamNameKeywords = ['delegate', 'delegatee', 'baker', 'validator']

    return {
      ...delegatorDetails,
      delegatees: delegatorDetails.delegatees,
      mainActions: delegatorDetails.availableActions
        ? this.createDefaultMainDelegatorActions(
            delegatorDetails.availableActions,
            delegatees,
            defaultDelegateActionTypeKeywords,
            defaultUndelegateActionTypeKeywords,
            defaultMainParamNameKeywords
          )
        : [],
      displayRewards: delegatorDetails.rewards
        ? new UIRewardList({
            rewards: delegatorDetails.rewards.slice(0, 5),
            indexColLabel: 'Index',
            amountColLabel: 'Reward',
            payoutColLabel: 'Payout'
          })
        : undefined
    }
  }

  private createDefaultMainDelegatorActions(
    availableActions: DelegatorAction[],
    delegatees: string[],
    delegateActionTypeKeywords: string[],
    undelegateActionTypeKeywords: string[],
    delegateeArgKeywords: string[]
  ): AirGapDelegatorAction[] | undefined {
    return [
      this.createDefaultDelegateAction(availableActions, delegatees, delegateActionTypeKeywords, delegateeArgKeywords, 'Delegate'),
      this.createDefaultDelegateAction(availableActions, delegatees, undelegateActionTypeKeywords, delegateeArgKeywords, 'Undelegate'),
      ...this.createDefaultExtraActions(availableActions, [...delegateActionTypeKeywords, ...undelegateActionTypeKeywords])
    ].filter(action => !!action)
  }

  private createDefaultDelegateAction(
    availableActions: DelegatorAction[],
    delegatees: string[],
    typeKeywords: any[],
    argsKeywords: string[] = [],
    label: string
  ): AirGapDelegatorAction | null {
    const action = availableActions.find(action => typeKeywords.includes(action.type))
    if (action) {
      const paramName = action.args ? action.args.find(arg => argsKeywords.includes(arg)) : undefined
      const args = action.args ? action.args.filter(arg => arg !== paramName) : undefined

      const form = paramName ? this.formBuilder.group({ [paramName]: delegatees }) : undefined

      return {
        type: action.type,
        label,
        form: form,
        args: args
          ? args.map(
              arg =>
                new UIInputText({
                  id: arg,
                  label: arg
                })
            )
          : undefined
      }
    }

    return null
  }

  private createDefaultExtraActions(availableActions: DelegatorAction[], ignoreTypeKeywords: string[]): AirGapDelegatorAction[] {
    const extraActions = availableActions.filter(action => !ignoreTypeKeywords.includes(action.type))

    return extraActions.map(action => ({
      type: action.type,
      label: action.type.toString(),
      confirmLabel: action.type.toString(),
      args: action.args
        ? action.args.map(
            arg =>
              new UIInputText({
                id: arg,
                label: arg
              })
          )
        : undefined
    }))
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
      const isDelegated = await this.checkDelegated(protocol, address)
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

  public async checkDelegated(protocol: ICoinDelegateProtocol, address: string): Promise<boolean> {
    return supportsDelegation(protocol) ? protocol.isAddressDelegating(address) : false
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
      } else if (wallet.coinProtocol.identifier === ProtocolSymbols.TZBTC) {
        const protocol = new TezosBTC()

        rawUnsignedTx = await protocol.transfer(
          wallet.addresses[0],
          address,
          amount.toString(10),
          fee.toString(10), // TODO calculate how high a fee we have to set for the TezosBTC contract
          wallet.publicKey
        )
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

  public async estimateMaxTransferAmount(wallet: AirGapMarketWallet, destination: string, fee?: BigNumber): Promise<BigNumber> {
    const maxAmount = await wallet.getMaxTransferValue([destination], fee ? fee.toFixed() : undefined)
    return new BigNumber(maxAmount)
  }

  public async estimateFees(wallet: AirGapMarketWallet, address: string, amount: BigNumber, data?: any): Promise<FeeDefaults> {
    try {
      return await wallet.estimateFees([address], [amount.toFixed()], data)
    } catch (error) {
      console.error(error)
      return wallet.coinProtocol.feeDefaults
    }
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
