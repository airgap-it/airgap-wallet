import { DecimalPipe } from '@angular/common'
import { FormBuilder, FormGroup } from '@angular/forms'
import { DelegationInfo, TezosDelegatorAction, TezosProtocol } from 'airgap-coin-lib'
import { DelegateeDetails, DelegatorAction, DelegatorDetails } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'
import BigNumber from 'bignumber.js'
import {
  AirGapDelegateeDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction,
  AirGapDelegatorDetails
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { BakerConfig, RemoteConfigProvider } from 'src/app/services/remote-config/remote-config'

import { ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'

export class TezosDelegationExtensions extends ProtocolDelegationExtensions<TezosProtocol> {
  public static async create(
    remoteConfigProvider: RemoteConfigProvider,
    decimalPipe: DecimalPipe,
    amountConverter: AmountConverterPipe,
    formBuilder: FormBuilder
  ): Promise<TezosDelegationExtensions> {
    const bakersConfig = await remoteConfigProvider.tezosBakers()
    return new TezosDelegationExtensions(bakersConfig[0], decimalPipe, amountConverter, formBuilder)
  }

  public airGapDelegatee(protocol: TezosProtocol): string | undefined {
    if (protocol.options.network.type !== NetworkType.MAINNET) {
      return 'tz1PirboZKFVqkfE45hVLpkpXaZtLk3mqC17'
    }

    return this.airGapBakerConfig.address
  }

  // Replace default baker with testnet baker
  public delegateeLabel: string = 'Baker'

  private constructor(
    private readonly airGapBakerConfig: BakerConfig,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverter: AmountConverterPipe,
    private readonly formBuilder: FormBuilder
  ) {
    super()
  }

  // TODO: add translations
  public async getExtraDelegationDetailsFromAddress(
    protocol: TezosProtocol,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const delegationDetails = await protocol.getDelegationDetailsFromAddress(delegator, delegatees)
    const extraDetails = await this.getExtraDelegationDetails(protocol, delegationDetails.delegator, delegationDetails.delegatees[0])

    return [extraDetails]
  }

  private async getExtraDelegationDetails(
    protocol: TezosProtocol,
    delegatorDetails: DelegatorDetails,
    delegateeDetails: DelegateeDetails
  ): Promise<AirGapDelegationDetails> {
    const [delegator, delegatee] = await Promise.all([
      this.getExtraDelegatorDetails(delegatorDetails, delegateeDetails),
      this.getExtraBakerDetails(protocol, delegateeDetails)
    ])

    return { delegator, delegatees: [delegatee] }
  }

  private async getExtraBakerDetails(protocol: TezosProtocol, bakerDetails: DelegateeDetails): Promise<AirGapDelegateeDetails> {
    const isAirGapBaker = bakerDetails.address === this.airGapBakerConfig.address

    const bakerInfo = await protocol.bakerInfo(bakerDetails.address)

    const bakerTotalUsage = new BigNumber(bakerInfo.bakerCapacity).multipliedBy(0.7)
    const bakerCurrentUsage = new BigNumber(bakerInfo.stakingBalance)
    const bakerUsage = bakerCurrentUsage.dividedBy(bakerTotalUsage)

    let status: string
    if (bakerInfo.bakingActive && bakerUsage.lt(1)) {
      status = 'Accepts Delegation'
    } else if (bakerInfo.bakingActive) {
      status = 'Reached Full Capacity'
    } else {
      status = 'Deactivated'
    }

    const displayDetails = this.createDelegateeDisplayDetails(isAirGapBaker ? this.airGapBakerConfig : null)

    return {
      name: isAirGapBaker ? this.airGapBakerConfig.name : 'unknown',
      status,
      address: bakerDetails.address,
      usageDetails: {
        usage: bakerUsage,
        current: bakerCurrentUsage,
        total: bakerTotalUsage
      },
      displayDetails
    }
  }

  private async getExtraDelegatorDetails(
    delegatorDetails: DelegatorDetails,
    bakerDetails: DelegateeDetails
  ): Promise<AirGapDelegatorDetails> {
    const delegateAction = this.createDelegateAction(delegatorDetails.availableActions, bakerDetails.address)
    const undelegateAction = this.createUndelegateAction(delegatorDetails.availableActions)

    return {
      ...delegatorDetails,
      mainActions: delegateAction ? [delegateAction] : undefined,
      secondaryActions: undelegateAction ? [undelegateAction] : undefined
    }
  }

  public async getRewardDisplayDetails(
    protocol: TezosProtocol,
    delegator: string,
    delegatees: string[]
  ): Promise<UIRewardList | undefined> {
    const delegationDetails = await protocol.getDelegationDetailsFromAddress(delegator, delegatees)
    const delegatorExtraInfo = await protocol.getDelegationInfo(delegationDetails.delegator.address)

    return this.createDelegatorDisplayRewards(protocol, delegationDetails.delegator.address, delegatorExtraInfo).catch(() => undefined)
  }

  private createDelegateeDisplayDetails(bakerConfig: BakerConfig | null): UIWidget[] {
    return [
      new UIIconText({
        iconName: 'logo-usd',
        text: bakerConfig ? `${this.decimalPipe.transform(bakerConfig.fee.multipliedBy(100).toString())}%` : 'Unknown',
        description: 'Fee'
      }),
      new UIIconText({
        iconName: 'sync-outline',
        textHTML: bakerConfig ? `${bakerConfig.payout.cycles} Cycles <small>${bakerConfig.payout.time}</small>` : 'Unknown',
        description: 'Payout Schedule'
      })
    ]
  }

  private createDelegateAction(availableActions: DelegatorAction[], bakerAddress: string): AirGapDelegatorAction | null {
    return this.createDelegatorAction(
      availableActions,
      [TezosDelegatorAction.DELEGATE, TezosDelegatorAction.CHANGE_BAKER],
      'Delegate',
      this.formBuilder.group({ delegate: bakerAddress })
    )
  }

  private createUndelegateAction(availableActions: DelegatorAction[]): AirGapDelegatorAction | null {
    const action = this.createDelegatorAction(availableActions, [TezosDelegatorAction.UNDELEGATE], 'Undelegate')

    if (action) {
      action.iconName = 'close-outline'
    }

    return action
  }

  private createDelegatorAction(
    availableActions: DelegatorAction[],
    types: TezosDelegatorAction[],
    label: string,
    form?: FormGroup
  ): AirGapDelegatorAction | null {
    const action = availableActions.find(action => types.includes(action.type))

    return action
      ? {
          type: action.type,
          label,
          form: form
        }
      : null
  }

  private async createDelegatorDisplayRewards(
    protocol: TezosProtocol,
    address: string,
    delegatorExtraInfo: DelegationInfo
  ): Promise<UIRewardList | undefined> {
    if (!delegatorExtraInfo.isDelegated || !delegatorExtraInfo.value) {
      return undefined
    }
    const rewardInfo = await protocol.getDelegationRewards(delegatorExtraInfo.value, address)
    return new UIRewardList({
      rewards: rewardInfo.map(info => {
        return {
          index: info.cycle,
          amount: this.amountConverter.transform(new BigNumber(info.reward), {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          collected: info.payout < new Date(),
          timestamp: info.payout.getTime()
        }
      }),
      indexColLabel: 'Cycle',
      amountColLabel: 'Expected Reward',
      payoutColLabel: 'Earliest Payout'
    })
  }
}
