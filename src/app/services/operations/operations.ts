import { AeternityTransactionSignRequest } from '@airgap/aeternity'
import { ICoinProtocolAdapter, ICoinSubProtocolAdapter, ProtocolService } from '@airgap/angular-core'
import { SignPayloadRequestOutput } from '@airgap/beacon-sdk'
import { BitcoinTransactionSignRequest } from '@airgap/bitcoin'
import {
  AirGapMarketWallet,
  DelegateeDetails,
  DelegatorAction,
  DelegatorDetails,
  FeeDefaults,
  IAirGapTransaction,
  ICoinDelegateProtocol,
  ICoinProtocol,
  MainProtocolSymbols,
  ProtocolErrorType,
  SubProtocolSymbols
} from '@airgap/coinlib-core'
import { CosmosTransactionSignRequest } from '@airgap/cosmos-core/v1/serializer/v3/schemas/definitions/transaction-sign-request-cosmos'
import { EthereumTransactionSignRequest } from '@airgap/ethereum'
import { isMultisig, newAmount, newPublicKey } from '@airgap/module-kit'
import { IACMessageDefinitionObjectV3, IACMessageType } from '@airgap/serializer'
import { SubstrateTransactionSignRequest } from '@airgap/substrate'
import { TezosKtProtocol, TezosSaplingAddress, TezosShieldedTezProtocol, TezosTransactionSignRequest, TzBTCProtocol } from '@airgap/tezos'
import { Injectable } from '@angular/core'
import { UntypedFormBuilder } from '@angular/forms'
import { LoadingController, ToastController } from '@ionic/angular'
import BigNumber from 'bignumber.js'
import { BehaviorSubject } from 'rxjs'
import { map } from 'rxjs/operators'
import { StellarAssetProtocol, StellarProtocol } from '@airgap/stellar'

import { supportsAirGapDelegation, supportsDelegation } from '../../helpers/delegation'
import {
  AirGapDelegateeDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction,
  AirGapDelegatorDetails
} from '../../interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountExtendedDetails } from '../../models/widgets/display/UIAccountExtendedDetails'
import { UIAccountSummary } from '../../models/widgets/display/UIAccountSummary'
import { UIRewardList } from '../../models/widgets/display/UIRewardList'
import { UIInputText } from '../../models/widgets/input/UIInputText'
import { SaplingService } from '../sapling/sapling.service'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

export type SerializableTx = (
  | TezosTransactionSignRequest
  | EthereumTransactionSignRequest
  | BitcoinTransactionSignRequest
  | AeternityTransactionSignRequest
  | CosmosTransactionSignRequest
  | SubstrateTransactionSignRequest
)['transaction']

@Injectable({
  providedIn: 'root'
})
export class OperationsProvider {
  private readonly delegationStatuses: BehaviorSubject<Map<string, boolean>> = new BehaviorSubject(new Map())

  private readonly multisigStatuses: BehaviorSubject<Map<string, boolean>> = new BehaviorSubject(new Map())

  public constructor(
    private readonly loadingController: LoadingController,
    private readonly toastController: ToastController,
    private readonly formBuilder: UntypedFormBuilder,
    private readonly protocolService: ProtocolService,
    private readonly saplingService: SaplingService
  ) {}

  public async getDelegateesSummary(wallet: AirGapMarketWallet, delegatees: string[], data?: any): Promise<UIAccountSummary[]> {
    const protocol = wallet.protocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    if (supportsAirGapDelegation(protocol)) {
      return protocol.createDelegateesSummary(delegatees)
    } else {
      const delegateesDetails = await Promise.all(delegatees.map((delegatee) => protocol.getDelegateeDetails(delegatee, data)))
      return delegateesDetails.map(
        (details) =>
          new UIAccountSummary({
            address: details.address,
            header: [details.name, ''],
            description: [details.address, '']
          })
      )
    }
  }

  public async getAccountExtendedDetails(wallet: AirGapMarketWallet, data?: any): Promise<UIAccountExtendedDetails> {
    const protocol = wallet.protocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    if (supportsAirGapDelegation(protocol)) {
      return protocol.createAccountExtendedDetails(wallet.publicKey, wallet.receivingPublicAddress, data)
    } else {
      return new UIAccountExtendedDetails({ items: [] })
    }
  }

  public async getStellarAssetTrustline(wallet: AirGapMarketWallet): Promise<UIAccountExtendedDetails> {
    const protocol = wallet.protocol as ICoinProtocolAdapter<StellarAssetProtocol>

    const trustline = await protocol.protocolV1.getTrustBalance({
      value: wallet.publicKey,
      type: 'pub',
      format: 'hex'
    })

    return new UIAccountExtendedDetails({
      items: [
        {
          label: 'Trustline',
          text: `${trustline.total.value} ${protocol.protocolV1.metadata.assetCode}`
        }
      ]
    })
  }

  public async getStellarMustisigWeights(wallet: AirGapMarketWallet): Promise<UIAccountExtendedDetails> {
    const protocol = wallet.protocol as ICoinProtocolAdapter<StellarProtocol>

    const signers = await protocol.protocolV1.getSigners({
      value: wallet.publicKey,
      type: 'pub',
      format: 'hex'
    })

    const threshold = await protocol.protocolV1.getThresholds({
      value: wallet.publicKey,
      type: 'pub',
      format: 'hex'
    })

    const items: { label: string; text: string }[] = []

    if (signers.length > 1) {
      items.push({ label: 'SIGNERS', text: 'Weight' })

      signers.forEach((signer) => {
        const start = signer.key.slice(0, 6)
        const end = signer.key.slice(-4)
        items.push({ label: `${start}...${end}`, text: signer.weight.toString() })
      })

      items.push({ label: 'THRESHOLD', text: 'Required' })

      items.push({
        label: 'Low Threshold',
        text: threshold.low_threshold.toString()
      })

      items.push({
        label: 'Medium Threshold',
        text: threshold.med_threshold.toString()
      })

      items.push({
        label: 'High Threshold',
        text: threshold.high_threshold.toString()
      })
    }

    return new UIAccountExtendedDetails({
      items
    })
  }

  public async getCurrentDelegatees(wallet: AirGapMarketWallet, data?: any): Promise<string[]> {
    const protocol = wallet.protocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    const current = await protocol.getCurrentDelegateesForAddress(wallet.receivingPublicAddress, data).catch((e) => {
      if (e.code === ProtocolErrorType.UNSUPPORTED) {
        return protocol.getCurrentDelegateesForPublicKey(wallet.publicKey, data)
      } else {
        throw e
      }
    })
    if (current.length === 0) {
      let defaultDelegatee: string
      if (supportsAirGapDelegation(protocol)) {
        defaultDelegatee = protocol.airGapDelegatee()
      }

      return [defaultDelegatee || (await protocol.getDefaultDelegatee())]
    }
    return current
  }

  public async getDelegatorDetails(wallet: AirGapMarketWallet, data?: any): Promise<DelegatorDetails> {
    const protocol = wallet.protocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    return protocol.getDelegatorDetailsFromAddress(wallet.receivingPublicAddress, data).catch((e) => {
      if (e.code === ProtocolErrorType.UNSUPPORTED) {
        return protocol.getDelegatorDetailsFromPublicKey(wallet.publicKey, data)
      } else {
        throw e
      }
    })
  }

  public async getDelegationDetails(wallet: AirGapMarketWallet, delegatees: string[], data?: any): Promise<AirGapDelegationDetails[]> {
    const protocol = wallet.protocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    return supportsAirGapDelegation(protocol)
      ? protocol.getExtraDelegationDetailsFromAddress(wallet.publicKey, wallet.receivingPublicAddress, delegatees, data)
      : [await this.getDefaultDelegationDetails(protocol, wallet.publicKey, wallet.receivingPublicAddress, delegatees, data)]
  }

  public async getRewardDisplayDetails(wallet: AirGapMarketWallet, delegatees: string[], data?: any): Promise<UIRewardList | undefined> {
    const protocol = wallet.protocol
    if (!supportsDelegation(protocol)) {
      return Promise.reject('Protocol does not support delegation.')
    }

    return supportsAirGapDelegation(protocol)
      ? protocol.getRewardDisplayDetails(wallet.receivingPublicAddress, delegatees, data)
      : undefined
  }

  private async getDefaultDelegationDetails(
    protocol: ICoinDelegateProtocol,
    delegatorPublicKey: string,
    delegatorAddress: string,
    delegatees: string[],
    data?: any
  ): Promise<AirGapDelegationDetails> {
    const details = await protocol.getDelegationDetailsFromAddress(delegatorAddress, delegatees, data).catch((e) => {
      if (e.code === ProtocolErrorType.UNSUPPORTED) {
        return protocol.getDelegationDetailsFromPublicKey(delegatorPublicKey, delegatees, data)
      } else {
        throw e
      }
    })

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
    return delegateesDetails.map((details) => ({
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
        : []
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
      this.createDefaultDelegateAction(
        availableActions,
        delegatees,
        delegateActionTypeKeywords,
        delegateeArgKeywords,
        'delegation-detail.delegate_label'
      ),
      this.createDefaultDelegateAction(
        availableActions,
        delegatees,
        undelegateActionTypeKeywords,
        delegateeArgKeywords,
        'delegation-detail.undelegate_label'
      ),
      ...this.createDefaultExtraActions(availableActions, [...delegateActionTypeKeywords, ...undelegateActionTypeKeywords])
    ].filter((action) => !!action)
  }

  private createDefaultDelegateAction(
    availableActions: DelegatorAction[],
    delegatees: string[],
    typeKeywords: any[],
    argsKeywords: string[] = [],
    label: string
  ): AirGapDelegatorAction | null {
    const action = availableActions.find((action) => typeKeywords.includes(action.type))
    if (action) {
      const paramName = action.args ? action.args.find((arg) => argsKeywords.includes(arg)) : undefined
      const args = action.args ? action.args.filter((arg) => arg !== paramName) : undefined

      const form = paramName ? this.formBuilder.group({ [paramName]: delegatees }) : undefined

      return {
        type: action.type,
        label,
        form: form,
        args: args
          ? args.map(
              (arg) =>
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
    const extraActions = availableActions.filter((action) => !ignoreTypeKeywords.includes(action.type))

    return extraActions.map((action) => ({
      type: action.type,
      label: action.type.toString(),
      confirmLabel: action.type.toString(),
      args: action.args
        ? action.args.map(
            (arg) =>
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
  ): Promise<{ airGapTxs: IAirGapTransaction[]; unsignedTx: any }> {
    if (supportsDelegation(wallet.protocol)) {
      const unsignedTx = (await wallet.protocol.prepareDelegatorActionFromPublicKey(wallet.publicKey, type, data))[0]

      const airGapTxs = await wallet.protocol.getTransactionDetails({
        publicKey: wallet.publicKey,
        transaction: unsignedTx
      })

      return { airGapTxs, unsignedTx }
    } else {
      return Promise.reject('Protocol does not support delegation.')
    }
  }

  public setDelegationStatusOfAddress(address: string, delegated: boolean) {
    this.delegationStatuses.next(this.delegationStatuses.getValue().set(address, delegated))
  }

  public async getDelegationStatus(wallet: AirGapMarketWallet, refresh: boolean = false) {
    const delegationStatus = this.delegationStatuses.getValue().get(wallet.receivingPublicAddress)
    if (refresh || delegationStatus === undefined) {
      const isDelegated = await this.checkDelegated(wallet)
      this.setDelegationStatusOfAddress(wallet.receivingPublicAddress, isDelegated)

      return isDelegated
    } else {
      return delegationStatus
    }
  }

  public async getDelegationStatusObservable(wallet: AirGapMarketWallet) {
    await this.getDelegationStatus(wallet)

    return this.delegationStatuses.pipe(map((delegationStatuses) => delegationStatuses.get(wallet.receivingPublicAddress)))
  }

  public refreshAllDelegationStatuses(wallets: AirGapMarketWallet[]) {
    Array.from(this.delegationStatuses.getValue().entries()).forEach((entry) => {
      const address = entry[0]
      const wallet = wallets.find((wallet) => wallet.receivingPublicAddress === address && supportsDelegation(wallet.protocol))
      if (wallet) {
        this.getDelegationStatus(wallet, true).catch(handleErrorSentry(ErrorCategory.OPERATIONS_PROVIDER))
      }
    })
  }

  public setMultisigStatusOfAddress(address: string, multisig: boolean) {
    this.multisigStatuses.next(this.multisigStatuses.getValue().set(address, multisig))
  }

  public async getMultisigStatus(wallet: AirGapMarketWallet, refresh: boolean = false) {
    const multisigStatus = this.multisigStatuses.getValue().get(wallet.receivingPublicAddress)
    if (refresh || multisigStatus === undefined) {
      const isMultisig = await this.checkMultisig(wallet)
      this.setMultisigStatusOfAddress(wallet.receivingPublicAddress, isMultisig)

      return isMultisig
    } else {
      return multisigStatus
    }
  }

  public async getMultisigStatusObservable(wallet: AirGapMarketWallet) {
    await this.getMultisigStatus(wallet)

    return this.multisigStatuses.pipe(map((multisigStatuses) => multisigStatuses.get(wallet.receivingPublicAddress)))
  }

  public refreshAllMultisigStatuses(wallets: AirGapMarketWallet[]) {
    Array.from(this.multisigStatuses.getValue().entries()).forEach((entry) => {
      const address = entry[0]
      const wallet = wallets.find((wallet) => wallet.receivingPublicAddress === address && supportsDelegation(wallet.protocol))
      if (wallet) {
        this.getMultisigStatus(wallet, true).catch(handleErrorSentry(ErrorCategory.OPERATIONS_PROVIDER))
      }
    })
  }

  public async prepareSignRequest(
    wallet: AirGapMarketWallet,
    serializableData: any,
    type: IACMessageType,
    generatedId: number
  ): Promise<IACMessageDefinitionObjectV3[]> {
    switch (type) {
      case IACMessageType.MessageSignRequest:
        return this.prepareMessageSignRequest(wallet, serializableData, type, generatedId)
      default:
        return this.prepareTransactionSignRequest(wallet, serializableData, type, generatedId)
    }
  }

  public async prepareTransactionSignRequest(
    wallet: AirGapMarketWallet,
    transaction: SerializableTx,
    type: IACMessageType,
    generatedId: number
  ): Promise<IACMessageDefinitionObjectV3[]> {
    const payload = {
      publicKey: wallet.publicKey,
      transaction: transaction as any, // TODO: Type
      callbackURL: 'airgap-wallet://?d='
    }
    return [
      {
        id: generatedId,
        protocol: wallet.protocol.identifier,
        type: type,
        payload: payload
      }
    ]
  }

  public async prepareMessageSignRequest(
    wallet: AirGapMarketWallet,
    request: SignPayloadRequestOutput,
    type: IACMessageType,
    generatedId: number
  ): Promise<IACMessageDefinitionObjectV3[]> {
    const payload = {
      publicKey: wallet.publicKey,
      message: request.payload,
      callbackURL: 'airgap-wallet://?d='
    }
    return [
      {
        id: generatedId,
        protocol: wallet.protocol.identifier,
        type: type,
        payload: payload
      }
    ]
  }

  public async checkDelegated(wallet: AirGapMarketWallet): Promise<boolean> {
    const protocol = wallet.protocol

    return supportsDelegation(protocol)
      ? protocol.isAddressDelegating(wallet.receivingPublicAddress).catch((e) => {
          if (e.code === ProtocolErrorType.UNSUPPORTED) {
            return protocol.isPublicKeyDelegating(wallet.publicKey)
          } else {
            throw e
          }
        })
      : false
  }

  public async checkMultisig(wallet: AirGapMarketWallet): Promise<boolean> {
    const protocol = wallet.protocol as ICoinProtocolAdapter

    return isMultisig(protocol.protocolV1)
      ? protocol.protocolV1
          .getMultisigStatus({
            value: wallet.receivingPublicAddress,
            type: 'pub',
            format: 'hex'
          })
          .catch(() => false)
      : false
  }

  public async prepareTransaction(
    wallet: AirGapMarketWallet,
    address: string,
    amount: BigNumber,
    fee: BigNumber,
    knownWallets: AirGapMarketWallet[],
    data?: { [key: string]: any }
  ): Promise<{ airGapTxs: IAirGapTransaction[]; unsignedTx: any }> {
    const loader = await this.getAndShowLoader()

    try {
      let unsignedTx
      // TODO: This is an UnsignedTransaction, not an IAirGapTransaction
      let airGapTxs: IAirGapTransaction[]
      if (wallet.protocol.identifier === SubProtocolSymbols.XTZ_KT) {
        if (!(wallet.protocol instanceof ICoinProtocolAdapter)) {
          throw new Error('Invalid Tezos KT protocol')
        }
        const tezosKtAdapter: ICoinProtocolAdapter<TezosKtProtocol> = wallet.protocol
        const transactionSignRequest = await tezosKtAdapter.convertUnsignedTransactionV1ToV0(
          await tezosKtAdapter.protocolV1.migrateKtContract(newPublicKey(wallet.publicKey, 'hex'), wallet.receivingPublicAddress), // TODO change this
          wallet.publicKey
        )
        unsignedTx = transactionSignRequest.transaction
        airGapTxs = await wallet.protocol.getTransactionDetails({
          publicKey: wallet.publicKey,
          transaction: unsignedTx
        })
      } else if (wallet.protocol.identifier === SubProtocolSymbols.XTZ_BTC) {
        if (!(wallet.protocol instanceof ICoinSubProtocolAdapter)) {
          throw new Error('Invalid TzBTC protocol')
        }
        const tzBTCAdapter: ICoinProtocolAdapter<TzBTCProtocol> = wallet.protocol

        const transactionSignRequest = await tzBTCAdapter.convertUnsignedTransactionV1ToV0(
          await tzBTCAdapter.protocolV1.transfer(
            wallet.addresses[0],
            address,
            newAmount(amount.toString(10), 'blockchain'),
            newAmount(fee.toString(10), 'blockchain'), // TODO calculate how high a fee we have to set for the TezosBTC contract
            newPublicKey(wallet.publicKey, 'hex')
          ),
          wallet.publicKey
        )
        unsignedTx = transactionSignRequest.transaction

        airGapTxs = await tzBTCAdapter.getTransactionDetails({
          publicKey: wallet.publicKey,
          transaction: unsignedTx
        })
      } else if (wallet.protocol.identifier === MainProtocolSymbols.XTZ && TezosSaplingAddress.isZetAddress(address)) {
        const protocols: ICoinProtocol[] = (await this.protocolService.getProtocolsForAddress(address)).filter(
          (protocol: ICoinProtocol) =>
            protocol.identifier !== MainProtocolSymbols.XTZ &&
            protocol.options.network.identifier === wallet.protocol.options.network.identifier
        )

        if (protocols.length > 1) {
          throw new Error('More than 1 sapling protocol is supported')
        }

        const protocol = protocols[0]
        if (!(protocol instanceof ICoinProtocolAdapter)) {
          throw new Error('Invalid sapling protocol')
        }
        const shieldedTezAdapter: ICoinProtocolAdapter<TezosShieldedTezProtocol> = protocol

        await this.saplingService.initSapling()
        const transactionSignRequest = await shieldedTezAdapter.convertUnsignedTransactionV1ToV0(
          await shieldedTezAdapter.protocolV1.prepareShieldTransaction(
            newPublicKey(wallet.publicKey, 'hex'),
            [
              {
                to: address,
                amount: newAmount(amount.toString(10), 'blockchain')
              }
            ],
            {
              fee: newAmount(fee.toString(10), 'blockchain')
            }
          ),
          wallet.publicKey,
          undefined,
          wallet.protocol.identifier
        )
        unsignedTx = transactionSignRequest.transaction

        const knownViewingKeys: string[] = knownWallets
          .filter((wallet: AirGapMarketWallet) => wallet.protocol.identifier === protocol.identifier)
          .map((wallet: AirGapMarketWallet) => wallet.publicKey)

        airGapTxs = await shieldedTezAdapter.getTransactionDetails(
          {
            publicKey: wallet.publicKey,
            transaction: unsignedTx
          },
          {
            knownViewingKeys,
            transactionOwner: wallet.protocol.identifier
          }
        )
      } else {
        if (wallet.protocol.identifier === MainProtocolSymbols.XTZ_SHIELDED) {
          await this.saplingService.initSapling()
        }
        if (wallet.protocol.identifier === MainProtocolSymbols.BTC_SEGWIT) {
          // data could already contain "replaceByFee"
          if (!data) {
            data = {}
          }
          data.masterFingerprint = wallet.masterFingerprint
        }
        unsignedTx = await wallet.prepareTransaction([address], [amount.toString(10)], fee.toString(10), data)
        airGapTxs = await wallet.protocol.getTransactionDetails({
          publicKey: wallet.publicKey,
          transaction: unsignedTx
        })
      }

      return { airGapTxs, unsignedTx }
    } catch (error) {
      handleErrorSentry(ErrorCategory.COINLIB)(error)

      this.toastController
        .create({
          message: error.message,
          duration: 3000,
          position: 'bottom'
        })
        .then((toast) => {
          toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
        })
      throw error
    } finally {
      this.hideLoader(loader)
    }
  }

  public async estimateMaxTransferAmount(
    wallet: AirGapMarketWallet,
    destination: string,
    fee?: BigNumber,
    data?: { [key: string]: any }
  ): Promise<BigNumber> {
    const maxAmount = await wallet.getMaxTransferValue([destination], fee ? fee.toFixed() : undefined, data)
    return new BigNumber(maxAmount)
  }

  public async estimateFees(
    wallet: AirGapMarketWallet,
    address: string,
    amount: BigNumber,
    data?: { [key: string]: any }
  ): Promise<FeeDefaults> {
    try {
      return await wallet.estimateFees([address], [amount.toFixed()], data)
    } catch (error) {
      console.error(error)
      return wallet.protocol.feeDefaults
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
