import { TezosProtocol, DelegationRewardInfo, DelegationInfo, TezosDelegatorAction } from 'airgap-coin-lib'
import { ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction,
  AirGapRewardDisplayDetails
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { RemoteConfigProvider, TezosBakerDetails, TezosBakerCollection } from 'src/app/services/remote-config/remote-config'
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
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { TranslateService } from '@ngx-translate/core'

const hoursPerCycle: number = 68

export class TezosDelegationExtensions extends ProtocolDelegationExtensions<TezosProtocol> {
  private static instance: TezosDelegationExtensions

  public static async create(
    remoteConfigProvider: RemoteConfigProvider,
    decimalPipe: DecimalPipe,
    amountConverter: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe,
    translateService: TranslateService,
    formBuilder: FormBuilder
  ): Promise<TezosDelegationExtensions> {
    if (!TezosDelegationExtensions.instance) {
      TezosDelegationExtensions.instance = new TezosDelegationExtensions(
        remoteConfigProvider,
        decimalPipe,
        amountConverter,
        shortenStringPipe,
        translateService,
        formBuilder
      )
    }

    return TezosDelegationExtensions.instance
  }

  public airGapDelegatee?: string = 'tz1MJx9vhaNRSimcuXPK2rW4fLccQnDAnVKJ'

  public delegateeLabel: string = 'delegation-detail-tezos.delegatee-label'
  public delegateeLabelPlural: string = 'delegation-detail-tezos.delegatee-label-plural'
  public supportsMultipleDelegations: boolean = false

  private knownBakers?: TezosBakerCollection

  private constructor(
    private readonly remoteConfigProvider: RemoteConfigProvider,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverter: AmountConverterPipe,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService,
    private readonly formBuilder: FormBuilder
  ) {
    super()
  }

  public async getExtraDelegationDetailsFromAddress(
    protocol: TezosProtocol,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const delegationDetails = await protocol.getDelegationDetailsFromAddress(delegator, delegatees)
    const extraDetails = await this.getExtraDelegationDetails(protocol, delegationDetails.delegator, delegationDetails.delegatees[0])

    return [extraDetails]
  }

  public async createDelegateesSummary(_protocol: TezosProtocol, delegatees: string[]): Promise<UIAccountSummary[]> {
    const knownBakers: TezosBakerCollection = await this.getKnownBakers()

    type BakerDetails = Partial<TezosBakerDetails> & Record<'address', string>

    return [
      ...Object.entries(knownBakers).map(([address, baker]: [string, TezosBakerDetails]) => ({ address, ...baker })),
      ...delegatees.filter((baker: string) => !Object.keys(knownBakers).includes(baker)).map((baker: string) => ({ address: baker }))
    ]
      .sort((a: BakerDetails, b: BakerDetails) => {
        const aAlias: string = a.alias || ''
        const bAlias: string = b.alias || ''

        return aAlias.localeCompare(bAlias)
      })
      .map(
        (details: BakerDetails) =>
          new UIAccountSummary({
            address: details.address,
            logo: details.logo ? details.logo : undefined,
            header: [
              details.alias || '',
              details.fee ? `${this.decimalPipe.transform(new BigNumber(details.fee).times(100).toString())}%` : ''
            ],
            description: this.shortenStringPipe.transform(details.address)
          })
      )
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
    const [bakerInfo, knownBakers] = await Promise.all([protocol.bakerInfo(bakerDetails.address), this.getKnownBakers()])

    const bakerTotalUsage = new BigNumber(bakerInfo.bakerCapacity).multipliedBy(0.7)
    const bakerCurrentUsage = new BigNumber(bakerInfo.stakingBalance)
    const bakerUsage = bakerCurrentUsage.dividedBy(bakerTotalUsage)

    const knownBaker = knownBakers[bakerDetails.address]
    const name = knownBaker ? knownBaker.alias : this.translateService.instant('delegation-detail-tezos.unknown')

    let status: string
    if (bakerInfo.bakingActive && bakerUsage.lt(1)) {
      status = 'delegation-detail-tezos.status.accepts-delegation'
    } else if (bakerInfo.bakingActive) {
      status = 'delegation-detail-tezos.status.reached-full-capacity'
    } else {
      status = 'delegation-detail-tezos.status.deactivated'
    }

    const displayDetails = this.createDelegateeDisplayDetails(protocol, knownBaker)

    return {
      name,
      status,
      address: bakerDetails.address,
      logo: knownBaker ? knownBaker.logo : undefined,
      usageDetails: {
        usage: bakerUsage,
        current: bakerCurrentUsage,
        total: knownBaker && knownBaker.stakingCapacity ? knownBaker.stakingCapacity.shiftedBy(protocol.decimals) : bakerTotalUsage
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
  ): Promise<AirGapRewardDisplayDetails | undefined> {
    const delegationDetails = await protocol.getDelegationDetailsFromAddress(delegator, delegatees)
    const delegatorExtraInfo = await protocol.getDelegationInfo(delegationDetails.delegator.address)
    const [displayDetails, displayRewards] = await Promise.all([
      this.createDelegatorDisplayDetails(
        protocol,
        delegationDetails.delegator,
        delegatorExtraInfo,
        delegationDetails.delegatees[0].address
      ),
      this.createDelegatorDisplayRewards(protocol, delegationDetails.delegator.address, delegatorExtraInfo)
    ])
    return {
      displayDetails: displayDetails,
      displayRewards: displayRewards
    }
  }

  private createDelegateeDisplayDetails(protocol: TezosProtocol, baker?: TezosBakerDetails): UIWidget[] {
    return [
      new UIIconText({
        iconName: 'logo-usd',
        text:
          baker && baker.fee ? `${this.decimalPipe.transform(baker.fee.multipliedBy(100).toString())}%` : 'delegation-detail-tezos.unknown',
        description: 'delegation-detail-tezos.fee_label'
      }),
      new UIIconText({
        iconName: 'sync-outline',
        textHTML:
          baker && baker.payoutDelay !== undefined
            ? this.translateService.instant('delegation-detail-tezos.payout-schedule_text', {
                cycles: baker.payoutDelay,
                payoutTime: this.getFormattedCycleDuration(protocol)
              })
            : 'delegation-detail-tezos.unknown',
        description: 'delegation-detail-tezos.payout-schedule_label'
      })
    ]
  }

  private createDelegateAction(availableActions: DelegatorAction[], bakerAddress: string): AirGapDelegatorAction | null {
    return this.createDelegatorAction(
      availableActions,
      [TezosDelegatorAction.DELEGATE, TezosDelegatorAction.CHANGE_BAKER],
      'delegation-detail-tezos.delegate_label',
      this.formBuilder.group({ delegate: bakerAddress })
    )
  }

  private createUndelegateAction(availableActions: DelegatorAction[]): AirGapDelegatorAction | null {
    const action = this.createDelegatorAction(
      availableActions,
      [TezosDelegatorAction.UNDELEGATE],
      'delegation-detail-tezos.undelegate_label'
    )

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

    const knownBakers: TezosBakerCollection = await this.getKnownBakers()
    const knownBaker = knownBakers[baker]

    try {
      const bakerRewards = await protocol.getDelegationRewards(baker)
      details.push(...this.createFuturePayoutWidgets(protocol, delegatorDetails, delegatorExtraInfo, baker, bakerRewards, knownBaker))
    } catch (error) {
      // Baker was never delegated
    }

    return details
  }

  private async getRewardAmountsByCycle(
    protocol: TezosProtocol,
    accountAddress: string,
    bakerAddress: string
  ): Promise<Map<number, string>> {
    const currentCycle = await protocol.fetchCurrentCycle()
    const cycles = [...Array(6).keys()].map(num => currentCycle - num)
    return new Map<number, string>(
      await Promise.all(
        cycles.map(
          async (cycle): Promise<[number, string]> => [
            cycle,
            await this.getRewardAmountByCycle(protocol, accountAddress, bakerAddress, cycle)
          ]
        )
      )
    )
  }

  private async getRewardAmountByCycle(
    protocol: TezosProtocol,
    accountAddress: string,
    bakerAddress: string,
    cycle: number
  ): Promise<string> {
    const knownBakers: TezosBakerCollection = await this.getKnownBakers()

    const knownBaker = knownBakers[bakerAddress]
    const firstWithFee = Object.values(knownBakers).find((baker: TezosBakerDetails) => baker.fee)

    const defaultFee = firstWithFee ? firstWithFee.fee : new BigNumber(0)
    const fee = knownBaker && knownBaker.fee ? knownBaker.fee : defaultFee

    return from(protocol.calculateRewards(bakerAddress, cycle))
      .pipe(
        switchMap(tezosRewards =>
          from(protocol.calculatePayout(accountAddress, tezosRewards)).pipe(
            map(payout => {
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
    const amountByCycle = await this.getRewardAmountsByCycle(protocol, address, delegatorExtraInfo.value)

    return new UIRewardList({
      rewards: rewardInfo.slice(0, 5).map(reward => ({
        index: reward.cycle,
        amount: amountByCycle.get(reward.cycle),
        collected: reward.payout < new Date(),
        timestamp: reward.payout.getTime()
      })),
      indexColLabel: 'delegation-detail-tezos.rewards.index-col_label',
      amountColLabel: 'delegation-detail-tezos.rewards.amount-col_label',
      payoutColLabel: 'delegation-detail-tezos.rewards.payout-col_label'
    })
  }

  private createFuturePayoutWidgets(
    protocol: TezosProtocol,
    delegatorDetails: DelegatorDetails,
    delegatorExtraInfo: DelegationInfo,
    baker: string,
    bakerRewards: DelegationRewardInfo[],
    bakerDetails?: TezosBakerDetails
  ): UIWidget[] {
    const nextPayout = this.getNextPayoutMoment(delegatorExtraInfo, bakerRewards, bakerDetails ? bakerDetails.payoutDelay : undefined)

    const avgRoIPerCyclePercentage = bakerRewards
      .map(rewardInfo => rewardInfo.totalRewards.plus(rewardInfo.totalFees).div(rewardInfo.stakingBalance))
      .reduce((avg, value) => avg.plus(value))
      .div(bakerRewards.length)

    const avgRoIPerCycle = new BigNumber(avgRoIPerCyclePercentage).multipliedBy(delegatorDetails.balance)

    return [
      new UIIconText({
        iconName: 'sync-outline',
        text: nextPayout.fromNow(),
        description: delegatorDetails.delegatees.includes(baker)
          ? 'delegation-detail-tezos.next-payout_label'
          : 'delegation-detail-tezos.first-payout_label'
      }),
      new UIIconText({
        iconName: 'alarm-outline',
        text: this.amountConverter.transform(avgRoIPerCycle.toFixed(), {
          protocolIdentifier: protocol.identifier,
          maxDigits: 10
        }),
        description: 'delegation-detail-tezos.return-per-cycle_label'
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

  private async getKnownBakers(): Promise<TezosBakerCollection> {
    if (this.knownBakers === undefined) {
      this.knownBakers = await this.remoteConfigProvider.getKnownTezosBakers()
    }

    return this.knownBakers
  }

  private getFormattedCycleDuration(protocol: TezosProtocol): string {
    const cycleDuration = moment.duration(protocol.minCycleDuration)

    const days = Math.floor(cycleDuration.asDays())
    const hours = Math.floor(cycleDuration.asHours() - days * 24)
    const minutes = Math.floor(cycleDuration.asMinutes() - (days * 24 * 60 + hours * 60))

    return `${days}d ${hours}h ${minutes}m`
  }
}
