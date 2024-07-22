import { AddressService, AmountConverterPipe, ICoinDelegateProtocolAdapter } from '@airgap/angular-core'
import { DelegateeDetails, DelegatorAction, DelegatorDetails } from '@airgap/coinlib-core/protocols/ICoinDelegateProtocol'
import { NetworkType } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { TezosDelegatorAction, TezosProtocol, TezosUnits } from '@airgap/tezos'
import { DecimalPipe } from '@angular/common'
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms'
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

import { Amount, newAmount } from '@airgap/module-kit'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'
import { V1ProtocolDelegationExtensions } from './base/V1ProtocolDelegationExtensions'

enum ArgumentName {
  STAKE = 'stake',
  STAKE_CONTROL = 'stakeControl'
}

export class TezosDelegationExtensions extends V1ProtocolDelegationExtensions<TezosProtocol> {
  private static instance: TezosDelegationExtensions

  public static async create(
    coinlibService: CoinlibService,
    decimalPipe: DecimalPipe,
    _amountConverter: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe,
    translateService: TranslateService,
    addressService: AddressService,
    formBuilder: UntypedFormBuilder
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

  public airGapDelegatee(adapter: ICoinDelegateProtocolAdapter<TezosProtocol>): string | undefined {
    if (adapter.options.network.type !== NetworkType.MAINNET) {
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
    private readonly formBuilder: UntypedFormBuilder
  ) {
    super()
  }

  public async getExtraDelegationDetailsFromAddress(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    _publicKey: string,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const delegationDetails = await adapter.getDelegationDetailsFromAddress(delegator, delegatees)
    const extraDetails = await this.getExtraDelegationDetails(
      adapter,
      delegator,
      delegationDetails.delegator,
      delegationDetails.delegatees[0]
    )

    return [extraDetails]
  }

  public async createDelegateesSummary(
    _adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    delegatees: string[]
  ): Promise<UIAccountSummary[]> {
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
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    delegatorDetails: DelegatorDetails,
    delegateeDetails: DelegateeDetails
  ): Promise<AirGapDelegationDetails> {
    const [delegator, delegatee] = await Promise.all([
      this.getExtraDelegatorDetails(adapter, address, delegatorDetails, delegateeDetails),
      this.getExtraBakerDetails(adapter, delegateeDetails, address)
    ])

    return { delegator, delegatees: [delegatee] }
  }

  private async getExtraBakerDetails(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    bakerDetails: DelegateeDetails,
    address: string
  ): Promise<AirGapDelegateeDetails> {
    const [bakerInfo, delegateeDetails, knownBakers] = await Promise.all([
      adapter.protocolV1.bakerDetails(bakerDetails.address),
      adapter.getDelegateeDetails(bakerDetails.address),
      this.getKnownBakers()
    ])
    const knownBaker = knownBakers[bakerDetails.address]
    const name = knownBaker
      ? knownBaker.alias
      : (await this.addressService.getAlias(bakerDetails.address, adapter)) ||
        this.translateService.instant('delegation-detail-tezos.unknown')

    const bakerTotalUsage =
      knownBaker && knownBaker.stakingCapacity
        ? knownBaker.stakingCapacity.shiftedBy(adapter.decimals)
        : new BigNumber(bakerInfo.bakerCapacity).multipliedBy(0.7)

    const bakerCurrentUsage = BigNumber.minimum(new BigNumber(bakerInfo.stakingBalance.value), bakerTotalUsage)
    const bakerUsage = bakerCurrentUsage.dividedBy(bakerTotalUsage)

    let status: string
    if (delegateeDetails.status && bakerUsage.lt(1)) {
      status = 'delegation-detail-tezos.status.accepts-delegation'
    } else if (delegateeDetails.status === 'Active') {
      status = 'delegation-detail-tezos.status.reached-full-capacity'
    } else {
      status = 'delegation-detail-tezos.status.deactivated'
    }

    const displayDetails = await this.createDelegateeDisplayDetails(adapter, address, knownBaker)

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
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    delegatorDetails: DelegatorDetails,
    bakerDetails: DelegateeDetails
  ): Promise<AirGapDelegatorDetails> {
    const delegateAction = await this.createDelegateAction(adapter, address, delegatorDetails.availableActions, bakerDetails.address)
    const undelegateAction = await this.createUndelegateAction(adapter, address, delegatorDetails.availableActions)
    const stakeAction = await this.createStakeAction(adapter, address, delegatorDetails.availableActions)
    const unstakeAction = await this.createUnstakeAction(adapter, address, delegatorDetails.availableActions)
    const finalizeUnstakeAction = await this.createUnstakeFinalizeAction(adapter, address, delegatorDetails.availableActions)

    const mainActions: AirGapDelegatorAction[] = []

    if (delegateAction) {
      mainActions.push(delegateAction)
    }

    if (stakeAction) {
      mainActions.push(stakeAction)
    }

    if (unstakeAction) {
      mainActions.push(unstakeAction)
    }

    if (finalizeUnstakeAction) {
      mainActions.push(finalizeUnstakeAction)
    }

    return {
      ...delegatorDetails,
      mainActions: mainActions.length !== 0 ? mainActions : undefined,
      secondaryActions: undelegateAction ? [undelegateAction] : undefined
    }
  }

  public async getRewardDisplayDetails(
    _adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    _delegator: string
  ): Promise<UIRewardList | undefined> {
    return undefined
    // const delegatorExtraInfo = await protocol.getDelegationInfo(delegator)

    // return this.createDelegatorDisplayRewards(protocol, delegator, delegatorExtraInfo).catch(() => undefined)
  }

  private async createDelegateeDisplayDetails(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    baker?: TezosBakerDetails
  ): Promise<UIWidget[]> {
    const delegateeDisplayDetails: UIWidget[] = [
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
            ? await this.getDetailedPayoutScheduleText(adapter, baker)
            : 'delegation-detail-tezos.unknown',
        description: 'delegation-detail-tezos.payout-schedule_label'
      })
    ]

    const stakedBalance = await adapter.protocolV1.getstakeBalance(address)
    const { requests } = await adapter.protocolV1.getUnfinalizeRequest(address)
    const metaData = await adapter.protocolV1.getMetadata()
    const finalizeableBalance = await adapter.protocolV1.getFinalizeableBalance(address)

    if (new BigNumber(stakedBalance.total.value).gt(0)) {
      delegateeDisplayDetails.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: `${newAmount(stakedBalance.total).convert('tez', metaData.units).value} XTZ`,
          description: 'delegation-detail-tezos.staked_balance'
        })
      )
    }

    requests.forEach((value) => {
      const unfinalizeAmount: Amount<TezosUnits> = newAmount(new BigNumber(value.amount), 'blockchain')

      delegateeDisplayDetails.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: `${newAmount(unfinalizeAmount).convert('tez', metaData.units).value} XTZ`,
          description: `delegation-detail-tezos.unstaked_balance`
        }),
        new UIIconText({
          iconName: 'time-outline',
          text: `${value.cycle + 4}`,
          description: `delegation-detail-tezos.finalized_cycle`
        })
      )
    })

    if (new BigNumber(finalizeableBalance.total.value).gt(0)) {
      delegateeDisplayDetails.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: `${newAmount(finalizeableBalance.total).convert('tez', metaData.units).value} XTZ`,
          description: 'delegation-detail-tezos.finalizeable_balance'
        })
      )
    }

    return delegateeDisplayDetails
  }

  private createDelegateAction(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    availableActions: DelegatorAction[],
    bakerAddress: string
  ): Promise<AirGapDelegatorAction | null> {
    return this.createDelegatorAction(
      adapter,
      address,
      availableActions,
      [TezosDelegatorAction.DELEGATE, TezosDelegatorAction.CHANGE_BAKER],
      'delegation-detail-tezos.delegate_label',
      this.formBuilder.group({ delegate: bakerAddress })
    )
  }

  private async createStakeAction(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    availableActions: DelegatorAction[]
  ): Promise<AirGapDelegatorAction | null> {
    return this.createDelegatorAction(
      adapter,
      address,
      availableActions,
      [TezosDelegatorAction.STAKE],
      'delegation-detail-tezos.stake_label'
    )
  }

  private async createUnstakeAction(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    availableActions: DelegatorAction[]
  ): Promise<AirGapDelegatorAction | null> {
    return this.createDelegatorAction(
      adapter,
      address,
      availableActions,
      [TezosDelegatorAction.UNSTAKE],
      'delegation-detail-tezos.unstake_label'
    )
  }

  private async createUnstakeFinalizeAction(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    availableActions: DelegatorAction[]
  ): Promise<AirGapDelegatorAction | null> {
    return this.createDelegatorAction(
      adapter,
      address,
      availableActions,
      [TezosDelegatorAction.UNSTAKEFINALIZABLEBALANCE],
      'delegation-detail-tezos.finalize_unstake_label'
    )
  }

  private async createUndelegateAction(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    availableActions: DelegatorAction[]
  ): Promise<AirGapDelegatorAction | null> {
    const action = await this.createDelegatorAction(
      adapter,
      address,
      availableActions,
      [TezosDelegatorAction.UNDELEGATE],
      'delegation-detail-tezos.undelegate_label'
    )

    if (action) {
      action.iconName = 'close-outline'
    }

    return action
  }

  private async createDelegatorAction(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    address: string,
    availableActions: DelegatorAction[],
    types: TezosDelegatorAction[],
    label: string,
    form?: UntypedFormGroup
  ): Promise<AirGapDelegatorAction | null> {
    const action = availableActions.find((action) => {
      return types.includes(action.type)
    })

    const addressBalance = await adapter.protocolV1.getBalanceOfAddress(address)
    const metaData = await adapter.protocolV1.getMetadata()
    const stakedBalance = await adapter.protocolV1.getstakeBalance(address)

    let total: Amount<TezosUnits> = newAmount(new BigNumber(0), 'blockchain')

    if (types[0] === TezosDelegatorAction.STAKE) {
      total = addressBalance.total
    }

    if (types[0] === TezosDelegatorAction.UNSTAKE) {
      total = stakedBalance.total
    }

    const maxValue = newAmount(total).convert('tez', metaData.units).value

    const maxValueShifted = new BigNumber(newAmount(total).blockchain(metaData.units).value)

    const argWidgets = []

    if (action?.args) {
      form = form
        ? form
        : this.formBuilder.group({
            [ArgumentName.STAKE]: [action.args.includes(ArgumentName.STAKE) && maxValue !== undefined ? maxValue : '0'],
            [ArgumentName.STAKE_CONTROL]: [
              maxValueShifted.toFixed(),
              Validators.compose([
                Validators.required,
                DecimalValidator.validate(adapter.decimals),
                Validators.max(Number(maxValue)),
                Validators.min(0.000001)
              ])
            ]
          })

      if (action.args.includes(ArgumentName.STAKE)) {
        argWidgets.push(
          this.createAmountWidget(ArgumentName.STAKE_CONTROL, maxValue ? maxValue : undefined, '1', {
            onValueChanged: (value: string) => {
              form.patchValue({ [ArgumentName.STAKE]: new BigNumber(value).shiftedBy(adapter.decimals).toFixed() })
            },
            toggleFixedValueButton: 'delegation-detail.max-amount_button',
            fixedValue: maxValue.toString()
          })
        )
      }
    }

    return action
      ? {
          type: action.type,
          label,
          form: form,
          args: argWidgets
        }
      : null
  }

  private async getKnownBakers(): Promise<TezosBakerCollection> {
    if (this.knownBakers === undefined) {
      this.knownBakers = await this.coinlibService.getKnownTezosBakers()
    }

    return this.knownBakers
  }

  private async getDetailedPayoutScheduleText(
    adapter: ICoinDelegateProtocolAdapter<TezosProtocol>,
    baker: TezosBakerDetails
  ): Promise<string> {
    if (baker.payoutDelay === 1 && baker.payoutPeriod === 1) {
      return this.translateService.instant('delegation-detail-tezos.payout-schedule-every-cycle-last-rewards_text', {
        payoutTime: await this.getFormattedCycleDuration(adapter)
      })
    } else if (baker.payoutPeriod === 1) {
      return this.translateService.instant('delegation-detail-tezos.payout-schedule-every-cycle-delayed-rewards_text', {
        payoutTime: await this.getFormattedCycleDuration(adapter),
        payoutDelay: baker.payoutDelay
      })
    } else {
      return this.translateService.instant('delegation-detail-tezos.payout-schedule-every-n-cycle_text', {
        payoutTime: await this.getFormattedCycleDuration(adapter, baker.payoutPeriod),
        cycles: baker.payoutPeriod
      })
    }
  }

  private async getFormattedCycleDuration(adapter: ICoinDelegateProtocolAdapter<TezosProtocol>, cycleNumber: number = 1): Promise<string> {
    const minCycleDuration: number = await adapter.protocolV1.getMinCycleDuration()
    const cycleDuration = moment.duration(cycleNumber * minCycleDuration)

    return cycleDuration.locale(this.translateService.currentLang).humanize()
  }
}
