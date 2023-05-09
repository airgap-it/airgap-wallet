import { AddressService, AmountConverterPipe } from '@airgap/angular-core'
import { DelegateeDetails, DelegatorAction, DelegatorDetails } from '@airgap/coinlib-core/protocols/ICoinDelegateProtocol'
import { NetworkType } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { TezosDelegatorAction, TezosProtocol } from '@airgap/tezos'
import { DecimalPipe } from '@angular/common'
import { FormBuilder, FormGroup } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import BigNumber from 'bignumber.js'
import * as moment from 'moment'
import {
  AirGapDelegateeDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction,
  AirGapDelegatorDetails
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { CoinlibService, TezosBakerCollection, TezosBakerDetails } from 'src/app/services/coinlib/coinlib.service'

import { V0ProtocolDelegationExtensions } from './base/V0ProtocolDelegationExtensions'

export class TezosDelegationExtensions extends V0ProtocolDelegationExtensions<TezosProtocol> {
  private static instance: TezosDelegationExtensions

  public static async create(
    coinlibService: CoinlibService,
    decimalPipe: DecimalPipe,
    _amountConverter: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe,
    translateService: TranslateService,
    addressService: AddressService,
    formBuilder: FormBuilder
  ): Promise<TezosDelegationExtensions> {
    if (!TezosDelegationExtensions.instance) {
      TezosDelegationExtensions.instance = new TezosDelegationExtensions(
        coinlibService,
        decimalPipe,
        // amountConverter,
        shortenStringPipe,
        translateService,
        addressService,
        formBuilder
      )
    }

    return TezosDelegationExtensions.instance
  }

  public airGapDelegatee(protocol: TezosProtocol): string | undefined {
    if (protocol.options.network.type !== NetworkType.MAINNET) {
      return 'tz1aWXP237BLwNHJcCD4b3DutCevhqq2T1Z9'
    }

    return 'tz1MJx9vhaNRSimcuXPK2rW4fLccQnDAnVKJ'
  }

  public delegateeLabel: string = 'delegation-detail-tezos.delegatee-label'
  public delegateeLabelPlural: string = 'delegation-detail-tezos.delegatee-label-plural'
  public supportsMultipleDelegations: boolean = false

  private knownBakers?: TezosBakerCollection

  private constructor(
    private readonly coinlibService: CoinlibService,
    private readonly decimalPipe: DecimalPipe,
    // private readonly amountConverterPipe: AmountConverterPipe,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService,
    private readonly addressService: AddressService,
    private readonly formBuilder: FormBuilder
  ) {
    super()
  }

  public async getExtraDelegationDetailsFromAddress(
    protocol: TezosProtocol,
    _publicKey: string,
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
    const [bakerInfo, delegateeDetails, knownBakers] = await Promise.all([
      protocol.bakerInfo(bakerDetails.address),
      protocol.getDelegateeDetails(bakerDetails.address),
      this.getKnownBakers()
    ])
    const knownBaker = knownBakers[bakerDetails.address]
    const name = knownBaker
      ? knownBaker.alias
      : (await this.addressService.getAlias(bakerDetails.address, protocol)) ||
        this.translateService.instant('delegation-detail-tezos.unknown')

    const bakerTotalUsage =
      knownBaker && knownBaker.stakingCapacity
        ? knownBaker.stakingCapacity.shiftedBy(protocol.decimals)
        : new BigNumber(bakerInfo.bakerCapacity).multipliedBy(0.7)

    const bakerCurrentUsage = BigNumber.minimum(new BigNumber(bakerInfo.stakingBalance), bakerTotalUsage)
    const bakerUsage = bakerCurrentUsage.dividedBy(bakerTotalUsage)

    let status: string
    if (delegateeDetails.status && bakerUsage.lt(1)) {
      status = 'delegation-detail-tezos.status.accepts-delegation'
    } else if (delegateeDetails.status === 'Active') {
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

  public async getRewardDisplayDetails(_protocol: TezosProtocol, _delegator: string): Promise<UIRewardList | undefined> {
    return undefined
    // const delegatorExtraInfo = await protocol.getDelegationInfo(delegator)

    // return this.createDelegatorDisplayRewards(protocol, delegator, delegatorExtraInfo).catch(() => undefined)
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
          baker !== undefined && baker.payoutPeriod !== undefined && baker.payoutDelay !== undefined
            ? this.getDetailedPayoutScheduleText(protocol, baker)
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
    const action = availableActions.find((action) => types.includes(action.type))

    return action
      ? {
          type: action.type,
          label,
          form: form
        }
      : null
  }

  private async getKnownBakers(): Promise<TezosBakerCollection> {
    if (this.knownBakers === undefined) {
      this.knownBakers = await this.coinlibService.getKnownTezosBakers()
    }

    return this.knownBakers
  }

  private getDetailedPayoutScheduleText(protocol: TezosProtocol, baker: TezosBakerDetails): string {
    if (baker.payoutDelay === 1 && baker.payoutPeriod === 1) {
      return this.translateService.instant('delegation-detail-tezos.payout-schedule-every-cycle-last-rewards_text', {
        payoutTime: this.getFormattedCycleDuration(protocol)
      })
    } else if (baker.payoutPeriod === 1) {
      return this.translateService.instant('delegation-detail-tezos.payout-schedule-every-cycle-delayed-rewards_text', {
        payoutTime: this.getFormattedCycleDuration(protocol),
        payoutDelay: baker.payoutDelay
      })
    } else {
      return this.translateService.instant('delegation-detail-tezos.payout-schedule-every-n-cycle_text', {
        payoutTime: this.getFormattedCycleDuration(protocol, baker.payoutPeriod),
        cycles: baker.payoutPeriod
      })
    }
  }

  private getFormattedCycleDuration(protocol: TezosProtocol, cycleNumber: number = 1): string {
    const cycleDuration = moment.duration(cycleNumber * protocol.minCycleDuration)

    return cycleDuration.locale(this.translateService.currentLang).humanize()
  }
}
