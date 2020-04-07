import { TezosProtocol, TezosDelegationAction, TezosKtProtocol, DelegationRewardInfo, DelegationInfo } from 'airgap-coin-lib'
import { ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'
import { AirGapDelegateeDetails, AirGapDelegatorDetails, AirGapMainDelegatorAction } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { RemoteConfigProvider, BakerConfig } from 'src/app/services/remote-config/remote-config'
import { DecimalPipe } from '@angular/common'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import BigNumber from 'bignumber.js'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { DelegatorAction } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { Moment } from 'moment'
import * as moment from 'moment'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'

const hoursPerCycle: number = 68

const widgetId = {
  nextPayout: 'nextPayout',
  estimatedReturn: 'estimatedReturn'
}

export class TezosDelegationExtensions extends ProtocolDelegationExtensions<TezosProtocol> {
  public static async create(
    remoteConfigProvider: RemoteConfigProvider,
    decimalPipe: DecimalPipe,
    amountConverter: AmountConverterPipe
  ): Promise<TezosDelegationExtensions> {
    const bakersConfig = await remoteConfigProvider.tezosBakers()
    return new TezosDelegationExtensions(new TezosKtProtocol(), bakersConfig[0], decimalPipe, amountConverter)
  }

  public airGapDelegatee?: string = this.airGapBakerConfig.address
  public delegateeLabel: string = 'Baker'

  private constructor(
    private readonly ktProtocol: TezosKtProtocol,
    private readonly airGapBakerConfig: BakerConfig,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverter: AmountConverterPipe
  ) {
    super()
  }

  // TODO: add translations
  public async getExtraDelegateesDetails(_: TezosProtocol, addresses: string[]): Promise<Partial<AirGapDelegateeDetails>[]> {
    if (addresses.length > 1) {
      return Promise.reject('Multiple bakers are not supported.')
    }

    const address = addresses[0]

    const details = []
    if (address) {
      const isAirGapBaker = address === this.airGapBakerConfig.address

      const bakerInfo = await this.ktProtocol.bakerInfo(address)

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

      details.push({
        name: isAirGapBaker ? this.airGapBakerConfig.name : 'unknown',
        status,
        usageDetails: {
          usage: bakerUsage,
          current: bakerCurrentUsage,
          total: bakerTotalUsage
        },
        displayDetails,
        extraDetails: isAirGapBaker ? this.airGapBakerConfig : undefined
      })
    }

    return details
  }

  public async getExtraDelegatorDetailsFromAddress(protocol: TezosProtocol, address: string): Promise<Partial<AirGapDelegatorDetails>> {
    const results = await Promise.all([protocol.getDelegatorDetailsFromAddress(address), this.ktProtocol.isAddressDelegated(address)])

    const delegatorDetails = results[0]
    const delegatorExtraInfo = results[1]

    const delegateAction: AirGapMainDelegatorAction = this.createTezosMainDelegatorAction(
      delegatorDetails.availableActions,
      TezosDelegationAction.DELEGATE,
      {
        paramName: 'delegate',
        description: 'Delegate description',
        descriptionInactive: "Can't delegate"
      }
    )

    const undelegateAction: AirGapMainDelegatorAction = this.createTezosMainDelegatorAction(
      delegatorDetails.availableActions,
      TezosDelegationAction.UNDELEGATE,
      {
        description: 'Undelegate description',
        descriptionInactive: "Can't undelegate"
      }
    )

    const changeDelegateeAction: AirGapMainDelegatorAction = this.createTezosMainDelegatorAction(
      delegatorDetails.availableActions,
      TezosDelegationAction.CHANGE_BAKER,
      {
        description: 'Change Baker'
      }
    )

    const displayRewards: UIRewardList | undefined = await this.createDelegatorDisplayRewards(protocol, address, delegatorExtraInfo)

    return {
      delegateAction,
      undelegateAction,
      changeDelegateeAction,
      extraDetails: delegatorExtraInfo,
      displayRewards: displayRewards
    }
  }

  public async onDetailsChange(
    protocol: TezosProtocol,
    delegateesDetails: AirGapDelegateeDetails[],
    delegatorDetails: AirGapDelegatorDetails
  ): Promise<void> {
    if (delegateesDetails.length !== 1) {
      return
    }

    const bakerDetails = delegateesDetails[0]
    this.showFuturePayoutDetails(protocol, bakerDetails, delegatorDetails)
  }

  private createTezosMainDelegatorAction(
    availableActions: DelegatorAction[],
    type: TezosDelegationAction,
    config: {
      paramName?: string
      description: string
      descriptionInactive?: string
      availableByDefault?: boolean
    }
  ): AirGapMainDelegatorAction {
    const action = availableActions.find(action => action.type === type)
    if (action) {
      return {
        type: type,
        isAvailable: true,
        paramName: config.paramName,
        description: config.description
      }
    } else {
      return {
        isAvailable: config.availableByDefault || false,
        description: config.descriptionInactive || ''
      }
    }
  }

  private createDelegateeDisplayDetails(bakerConfig: BakerConfig | null): UIWidget[] {
    const details = []

    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: bakerConfig ? `${this.decimalPipe.transform(bakerConfig.fee.multipliedBy(100).toString())}%` : 'Unknown',
        description: 'Fee'
      }),
      new UIIconText({
        iconName: 'sync',
        text: bakerConfig ? `${bakerConfig.payout.cycles} Cycles ${bakerConfig.payout.time}` : 'Unknown',
        description: 'Payout Schedule'
      })
    )

    return details
  }

  private async createDelegatorDisplayRewards(
    protocol: TezosProtocol,
    address: string,
    delegatorExtraInfo: DelegationInfo
  ): Promise<UIRewardList | undefined> {
    if (!delegatorExtraInfo.isDelegated || !delegatorExtraInfo.value) {
      return undefined
    }

    const rewardInfo = await this.ktProtocol.delegationRewards(delegatorExtraInfo.value, address)

    return new UIRewardList({
      rewards: rewardInfo.slice(0, 5).map(reward => ({
        index: reward.cycle,
        amount: `~${this.amountConverter.transform(reward.reward, {
          protocolIdentifier: protocol.identifier,
          maxDigits: 10
        })}`,
        collected: reward.payout < new Date(),
        timestamp: reward.payout.getTime()
      })),
      indexColLabel: 'Cycle',
      amountColLabel: 'Expected Reward',
      payoutColLabel: 'Earliest Payout'
    })
  }

  private async showFuturePayoutDetails(
    protocol: TezosProtocol,
    bakerDetails: AirGapDelegateeDetails,
    delegatorDetails: AirGapDelegatorDetails
  ): Promise<void> {
    const bakerConfig = bakerDetails.extraDetails as BakerConfig

    let nextPayout: Moment | null = null
    let avgRoIPerCycle: BigNumber | null = null
    try {
      const bakerRewards = await this.ktProtocol.delegationRewards(bakerDetails.address)
      nextPayout = this.getNextPayoutMoment(delegatorDetails, bakerRewards, bakerConfig.payout ? bakerConfig.payout.cycles : undefined)

      const avgRoIPerCyclePercentage = bakerRewards
        .map(rewardInfo => rewardInfo.totalRewards.plus(rewardInfo.totalFees).div(rewardInfo.stakingBalance))
        .reduce((avg, value) => avg.plus(value))
        .div(bakerRewards.length)

      avgRoIPerCycle = new BigNumber(avgRoIPerCyclePercentage).multipliedBy(delegatorDetails.balance)
    } catch (error) {
      // If Baker has never delegated
    }

    this.addPayoutWidgets(protocol, delegatorDetails, nextPayout, avgRoIPerCycle)
  }

  private getNextPayoutMoment(
    delegatorDetails: AirGapDelegatorDetails,
    bakerRewards: DelegationRewardInfo[],
    bakerPayoutCycles?: number
  ): Moment {
    let nextPayout: Moment
    if (delegatorDetails.isDelegating) {
      const delegatedCycles = bakerRewards.filter(value => value.delegatedBalance.isGreaterThan(0))
      const delegatedDate = delegatorDetails.extraDetails ? delegatorDetails.extraDetails.delegatedDate : undefined

      nextPayout = delegatedCycles.length > 0 ? moment(delegatedCycles[0].payout) : this.addPayoutDelayToMoment(moment(), bakerPayoutCycles)

      if (this.addPayoutDelayToMoment(moment(delegatedDate), bakerPayoutCycles).isAfter(nextPayout)) {
        nextPayout = this.addPayoutDelayToMoment(moment(delegatedDate), bakerPayoutCycles)
      }
    } else {
      nextPayout = this.addPayoutDelayToMoment(moment(), bakerPayoutCycles)
    }

    return nextPayout
  }

  private addPayoutDelayToMoment(time: Moment, payoutCycles?: number): Moment {
    return time.add(hoursPerCycle * 7 + payoutCycles || 0, 'h')
  }

  private addPayoutWidgets(
    protocol: TezosProtocol,
    delegatorDetails: AirGapDelegatorDetails,
    nextPayout: Moment | null,
    returnPerCycle: BigNumber | null
  ) {
    if (!delegatorDetails.displayDetails) {
      delegatorDetails.displayDetails = []
    }

    const nextPayoutWidget = nextPayout
      ? new UIIconText({
          id: widgetId.nextPayout,
          iconName: 'sync',
          text: nextPayout.fromNow(),
          description: delegatorDetails.isDelegating ? 'Next Payout' : 'First Payout'
        })
      : undefined

    const estimatedReturnWidget = returnPerCycle
      ? new UIIconText({
          id: widgetId.estimatedReturn,
          iconName: 'alarm',
          text: this.amountConverter.transform(returnPerCycle.toFixed(), {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'Estimated Return per Cycle'
        })
      : undefined

    this.updateWidget(delegatorDetails, widgetId.estimatedReturn, estimatedReturnWidget)
    this.updateWidget(delegatorDetails, widgetId.nextPayout, nextPayoutWidget)
  }
}
