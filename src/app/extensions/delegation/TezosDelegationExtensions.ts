import { TezosProtocol, DelegationRewardInfo, DelegationInfo, TezosDelegatorAction } from 'airgap-coin-lib'
import { ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { RemoteConfigProvider, BakerConfig } from 'src/app/services/remote-config/remote-config'
import { DecimalPipe } from '@angular/common'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import BigNumber from 'bignumber.js'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { Moment } from 'moment'
import * as moment from 'moment'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { DelegatorAction, DelegatorDetails, DelegateeDetails } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { FormBuilder, FormGroup } from '@angular/forms'
import { switchMap, map } from 'rxjs/operators'
import { from } from 'rxjs'

const hoursPerCycle: number = 68

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

  public airGapDelegatee?: string = this.airGapBakerConfig.address
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
      this.getExtraDelegatorDetails(protocol, delegatorDetails, delegateeDetails),
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
    protocol: TezosProtocol,
    delegatorDetails: DelegatorDetails,
    bakerDetails: DelegateeDetails
  ): Promise<AirGapDelegatorDetails> {
    const delegatorExtraInfo = await protocol.getDelegationInfo(delegatorDetails.address)

    const delegateAction = this.createDelegateAction(delegatorDetails.availableActions, bakerDetails.address)
    const undelegateAction = this.createUndelegateAction(delegatorDetails.availableActions)

    const [displayDetails, displayRewards] = await Promise.all([
      this.createDelegatorDisplayDetails(protocol, delegatorDetails, delegatorExtraInfo, bakerDetails.address),
      this.createDelegatorDisplayRewards(protocol, delegatorDetails.address, delegatorExtraInfo)
    ])

    return {
      ...delegatorDetails,
      mainActions: delegateAction ? [delegateAction] : undefined,
      secondaryActions: undelegateAction ? [undelegateAction] : undefined,
      displayDetails,
      displayRewards: displayRewards
    }
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

  private async createDelegatorDisplayDetails(
    protocol: TezosProtocol,
    delegatorDetails: DelegatorDetails,
    delegatorExtraInfo: DelegationInfo,
    baker: string
  ): Promise<UIWidget[]> {
    const details = []
    const bakerConfig = baker === this.airGapBakerConfig.address ? this.airGapBakerConfig : undefined

    try {
      const bakerRewards = await protocol.getDelegationRewards(baker)
      details.push(...this.createFuturePayoutWidgets(protocol, delegatorDetails, delegatorExtraInfo, baker, bakerRewards, bakerConfig))
    } catch (error) {
      // Baker was never delegated
    }

    return details
  }

  private async getRewardAmountsByCycle(accountAddress: string, bakerAddress: string): Promise<Map<number, string>> {
    const protocol = new TezosProtocol()
    const calculatedRewardsMap = new Map<number, string>()

    const currentCycle = await protocol.fetchCurrentCycle()
    const cycles = [...Array(6).keys()].map(num => currentCycle - num)

    const rewardsByCycle = await Promise.all(
      cycles.map(async cycle => {
        return {
          cycle: cycle,
          reward: await this.getRewardAmountByCycle(accountAddress, bakerAddress, cycle)
        }
      })
    )
    rewardsByCycle.forEach(rewardByCycle => {
      calculatedRewardsMap.set(rewardByCycle.cycle, rewardByCycle.reward)
    })
    return calculatedRewardsMap
  }

  private async getRewardAmountByCycle(accountAddress: string, bakerAddress: string, cycle: number): Promise<string> {
    const fee = this.airGapBakerConfig.fee
    const protocol = new TezosProtocol()
    return from(protocol.calculateRewards(bakerAddress, cycle))
      .pipe(
        switchMap(tezosRewards =>
          from(protocol.calculatePayout(accountAddress, tezosRewards)).pipe(
            map(payout => {
              console.log(payout, cycle)
              return payout
                ? `~${this.amountConverter.transform(new BigNumber(payout.payout).minus(new BigNumber(payout.payout).times(fee)), {
                    protocolIdentifier: protocol.identifier,
                    maxDigits: 6
                  })}`
                : null
            })
          )
        )
      )
      .toPromise()
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
    const amountByCycle = await this.getRewardAmountsByCycle(address, delegatorExtraInfo.value)

    console.log(amountByCycle)
    return new UIRewardList({
      rewards: rewardInfo.slice(0, 5).map(reward => ({
        index: reward.cycle,
        amount: amountByCycle.get(reward.cycle),
        collected: reward.payout < new Date(),
        timestamp: reward.payout.getTime()
      })),
      indexColLabel: 'Cycle',
      amountColLabel: 'Expected Reward',
      payoutColLabel: 'Earliest Payout'
    })
  }

  private createFuturePayoutWidgets(
    protocol: TezosProtocol,
    delegatorDetails: DelegatorDetails,
    delegatorExtraInfo: DelegationInfo,
    baker: string,
    bakerRewards: DelegationRewardInfo[],
    bakerConfig?: BakerConfig
  ): UIWidget[] {
    const nextPayout = this.getNextPayoutMoment(delegatorExtraInfo, bakerRewards, bakerConfig ? bakerConfig.payout.cycles : undefined)

    const avgRoIPerCyclePercentage = bakerRewards
      .map(rewardInfo => rewardInfo.totalRewards.plus(rewardInfo.totalFees).div(rewardInfo.stakingBalance))
      .reduce((avg, value) => avg.plus(value))
      .div(bakerRewards.length)

    const avgRoIPerCycle = new BigNumber(avgRoIPerCyclePercentage).multipliedBy(delegatorDetails.balance)

    return [
      new UIIconText({
        iconName: 'sync-outline',
        text: nextPayout.fromNow(),
        description: delegatorDetails.delegatees.includes(baker) ? 'Next Payout' : 'First Payout'
      }),
      new UIIconText({
        iconName: 'alarm-outline',
        text: this.amountConverter.transform(avgRoIPerCycle.toFixed(), {
          protocolIdentifier: protocol.identifier,
          maxDigits: 10
        }),
        description: 'Estimated Return per Cycle'
      })
    ]
  }

  private getNextPayoutMoment(
    delegatorExtraInfo: DelegationInfo,
    bakerRewards: DelegationRewardInfo[],
    bakerPayoutCycles?: number
  ): Moment {
    let nextPayout: Moment
    if (delegatorExtraInfo.isDelegated) {
      const delegatedCycles = bakerRewards.filter(value => value.delegatedBalance.isGreaterThan(0))
      const delegatedDate = delegatorExtraInfo.delegatedDate

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
}
