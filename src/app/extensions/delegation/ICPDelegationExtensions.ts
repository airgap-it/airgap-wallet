import { AmountConverterPipe, ICoinDelegateProtocolAdapter } from '@airgap/angular-core'
import { DelegatorAction } from '@airgap/coinlib-core'
import { ICPProtocol, ICPStakingActionType, ICPUnits } from '@airgap/icp'
import { ICPDelegateeDetails, ICPDelegatorDetails, Neuron } from '@airgap/icp/v1/types/governance'
import { Amount, newAmount, newPublicKey, ProtocolMetadata } from '@airgap/module-kit'
import { DecimalPipe } from '@angular/common'
import { FormBuilder, Validators } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import BigNumber from 'bignumber.js'
import * as humanizeDuration from 'humanize-duration'
import {
  AirGapDelegateeDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction,
  AirGapDelegatorDetails
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountExtendedDetails } from 'src/app/models/widgets/display/UIAccountExtendedDetails'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIInputDelay } from 'src/app/models/widgets/input/UIInputDelay'
import { UIInputWidget } from 'src/app/models/widgets/UIInputWidget'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'

import { V1ProtocolDelegationExtensions } from './base/V1ProtocolDelegationExtensions'

enum ArgumentName {
  FOLLOWEE = 'followee',
  AMOUNT = 'amount',
  AMOUNT_CONTROL = 'amountControl',
  DISSOLVE_DELAY = 'dissolveDelay',
  DISSOLVE_DELAY_CONTROL = 'dissolveDelayControl'
}

type DefaultAmountType = 'min' | 'max'

export class ICPDelegationExtensions extends V1ProtocolDelegationExtensions<ICPProtocol> {
  private static instance: ICPDelegationExtensions

  public static create(
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverterPipe: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe,
    translateService: TranslateService
  ): ICPDelegationExtensions {
    if (!ICPDelegationExtensions.instance) {
      ICPDelegationExtensions.instance = new ICPDelegationExtensions(
        formBuilder,
        decimalPipe,
        amountConverterPipe,
        shortenStringPipe,
        translateService
      )
    }

    return ICPDelegationExtensions.instance
  }

  public delegateeLabel: string = 'delegation-detail-icp.delegatee-label'
  public delegateeLabelPlural: string = 'delegation-detail-icp.delegatee-label-plural'
  public supportsMultipleDelegations: boolean = true

  private constructor(
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe,
    public readonly shortenStringPipe: ShortenStringPipe,
    public readonly translateService: TranslateService
  ) {
    super()
  }

  public async getExtraDelegationDetailsFromAddress(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    publicKey: string,
    _delegator: string,
    delegatees: string[],
    data?: { neuron?: Neuron }
  ): Promise<AirGapDelegationDetails[]> {
    const metadata = await adapter.protocolV1.getMetadata()
    const delegationsDetails = await Promise.all(
      delegatees.map((followee) =>
        adapter.protocolV1.getDelegationDetailsFromPublicKey(newPublicKey(publicKey, 'hex'), [followee], { neuron: data?.neuron })
      )
    )

    return Promise.all(
      delegationsDetails.map(async (details) => {
        const [delegator, followee] = await Promise.all([
          this.getExtraDelegatorDetails(adapter, metadata, publicKey, details.delegator, details.delegatees[0].address),
          this.getExtraFolloweeDetails(adapter, details.delegatees[0])
        ])

        return {
          delegator,
          delegatees: [followee].filter((followee) => !!followee)
        }
      })
    )
  }

  public async createDelegateesSummary(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    _delegatees: string[],
    _data?: { neuron?: Neuron }
  ): Promise<UIAccountSummary[]> {
    const followees = await adapter.protocolV1.getKnownNeurons()

    return followees.map((neuron) => {
      return new UIAccountSummary({
        address: neuron.id?.[0]?.id?.toString() || '',
        header: neuron.known_neuron_data?.[0]?.name || '',
        description: neuron.known_neuron_data?.[0]?.description[0] || ''
      })
    })
  }

  public async createAccountExtendedDetails(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    publicKey: string,
    _address: string,
    _data?: { neuron?: Neuron }
  ): Promise<UIAccountExtendedDetails> {
    const results = await Promise.all([
      adapter.protocolV1.getMetadata(),
      adapter.protocolV1.getBalanceOfPublicKey(newPublicKey(publicKey, 'hex'))
    ])

    const metadata = results[0]
    const availableBalance = newAmount(results[1].transferable ?? results[1].total).blockchain(metadata.units).value
    const totalBalance = newAmount(results[1].total).blockchain(metadata.units).value
    const lockedBalance = new BigNumber(totalBalance).minus(availableBalance).toFixed()

    return new UIAccountExtendedDetails({
      items: [
        {
          label: 'account-transaction-detail.available_label',
          text: `${await this.amountConverterPipe.transformValueOnly(availableBalance, adapter, 0)} ${adapter.symbol}`
        },
        {
          label: 'account-transaction-detail.delegated_label',
          text: `${await this.amountConverterPipe.transformValueOnly(lockedBalance, adapter, 0)} ${adapter.symbol}`
        },
      ]
    })
  }

  private async createDisplayDetails(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    delegatorDetails: ICPDelegatorDetails
  ): Promise<UIWidget[]> {
    const details: UIWidget[] = []

    const subaccountBalanceBN = new BigNumber(delegatorDetails.subaccountBalance)
    const stakeBN = delegatorDetails.stake ? new BigNumber(delegatorDetails.stake) : undefined

    if (subaccountBalanceBN.gt(0) && (stakeBN === undefined || !subaccountBalanceBN.eq(stakeBN))) {
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: await this.amountConverterPipe.transform(delegatorDetails.subaccountBalance, { protocol: adapter }),
          description: 'delegation-detail-icp.neuron-balance_label'
        })
      )
    }

    if (delegatorDetails.stake) {
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: await this.amountConverterPipe.transform(delegatorDetails.stake, { protocol: adapter }),
          description: 'delegation-detail-icp.staked_label'
        })
      )
    }

    if (delegatorDetails.votingPower) {
      details.push(
        new UIIconText({
          iconName: 'sync-outline',
          text: this.decimalPipe.transform(new BigNumber(delegatorDetails.votingPower).shiftedBy(-adapter.decimals).toString(), '1.0-2'),
          description: 'delegation-detail-icp.voting-power_label'
        })
      )
    }

    if (delegatorDetails.maturity) {
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: await this.amountConverterPipe.transform(delegatorDetails.maturity, { protocol: adapter }),
          description: 'delegation-detail-icp.maturity_label'
        })
      )
    }

    if (delegatorDetails.age) {
      details.push(
        new UIIconText({
          iconName: 'time-outline',
          text: humanizeDuration(delegatorDetails.age, {
            units: new BigNumber(delegatorDetails.age).gte(24 * 3600) ? ['y', 'd'] : ['h', 'm', 's'],
            round: true,
            unitMeasures: {
              y: 365 * 24 * 3600,
              d: 24 * 3600,
              h: 3600,
              m: 60,
              s: 1
            }
          }),
          description: 'delegation-detail-icp.age_label'
        })
      )
    }

    if (delegatorDetails.dissolveDelay) {
      details.push(
        new UIIconText({
          iconName: 'timer-outline',
          text: humanizeDuration(delegatorDetails.dissolveDelay, {
            units: new BigNumber(delegatorDetails.dissolveDelay).gte(24 * 3600) ? ['y', 'd'] : ['h', 'm', 's'],
            round: true,
            unitMeasures: {
              y: 365 * 24 * 3600,
              d: 24 * 3600,
              h: 3600,
              m: 60,
              s: 1
            }
          }),
          description: 'delegation-detail-icp.dissolve-delay_label'
        })
      )
    }

    return details
  }

  private async getExtraFolloweeDetails(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    followeeDetails: ICPDelegateeDetails,
  ): Promise<AirGapDelegateeDetails | undefined> {
    const currentUsage = new BigNumber(0)
    const totalUsage = new BigNumber(0)

    const displayDetails = await this.createFolloweeDisplayDetails(adapter, followeeDetails)

    return {
      ...followeeDetails,
      status: `delegation-detail-icp.followee-status.${followeeDetails.status}`,
      logo: undefined,
      usageDetails: {
        usage: currentUsage.div(totalUsage),
        current: currentUsage,
        total: totalUsage
      },
      displayDetails
    }
  }

  private async createFolloweeDisplayDetails(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    followeeDetails: ICPDelegateeDetails
  ): Promise<UIWidget[]> {
    const details: UIWidget[] = []

    details.push(
      new UIIconText({
        iconName: 'sync-outline',
        text: this.decimalPipe.transform(new BigNumber(followeeDetails.votingPower).shiftedBy(-adapter.decimals).toString(), '1.0-2'),
        description: 'delegation-detail-icp.voting-power_label'
      })
    )

    return details
  }

  private async getExtraDelegatorDetails(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    metadata: ProtocolMetadata<ICPUnits>,
    publicKey: string,
    delegatorDetails: ICPDelegatorDetails,
    followee: string
  ): Promise<AirGapDelegatorDetails> {
    const results = await Promise.all([
      this.createStakeAction(adapter, metadata, publicKey, delegatorDetails, followee),
      this.createFollowAction(adapter, metadata, delegatorDetails, followee),
      this.createIncreaseDissolveDelayAction(adapter, metadata, delegatorDetails),
      this.createMoreDetailsAction(adapter, metadata, delegatorDetails),
      this.createDisburseAction(adapter, metadata, delegatorDetails),
      this.createStartDissolvingAction(delegatorDetails),
      this.createStopDissolvingAction(adapter, metadata, delegatorDetails)
    ])

    const stakeAction = results[0]
    const followAction = results[1]
    const increaseDissolveDelayAction = results[2]
    const moreDetailsAction = results[3]
    const disburseAction = results[4]
    const startDissolvingAction = results[5]
    const stopDissolvingAction = results[6]


    const displayDetails = await this.createDisplayDetails(adapter, delegatorDetails)

    return {
      ...delegatorDetails,
      mainActions: [
        stakeAction, 
        followAction,
        increaseDissolveDelayAction,
        moreDetailsAction,
        stopDissolvingAction,
        disburseAction
      ].filter((action) => !!action),
      secondaryActions: [startDissolvingAction].filter((action) => !!action),
      displayDetails
    }
  }

  private async createStakeAction(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    metadata: ProtocolMetadata<ICPUnits>,
    publicKey: string,
    delegatorDetails: ICPDelegatorDetails,
    followee: string
  ): Promise<AirGapDelegatorAction | null> {
    const maxStake = await adapter.protocolV1.getMaxStakingAmount(newPublicKey(publicKey, 'hex'))
    const isStaking = new BigNumber(delegatorDetails.subaccountBalance).gt(0)
    const isFollowing = delegatorDetails.delegatees.includes(followee)

    const getDescription = async (action: DelegatorAction) => {
      if (action.type === ICPStakingActionType.STAKE_AND_FOLLOW) {
        if (!isStaking && !isFollowing) {
          return this.translateService.instant('delegation-detail-icp.stake-and-follow.not-staking-not-following_text', {
            minStake: await this.amountConverterPipe.transform(newAmount<ICPUnits>(1, 'ICP').blockchain(metadata.units).value, { protocol: adapter }),
            maxStake: await this.amountConverterPipe.transform(newAmount(maxStake).blockchain(metadata.units).value, { protocol: adapter })
          })
        }

        if (isStaking && !isFollowing) {
          return this.translateService.instant('delegation-detail-icp.stake-and-follow.staking-not-following_text', {
            neuronBalance: await this.amountConverterPipe.transform(delegatorDetails.subaccountBalance, { protocol: adapter }),
            maxStake: await this.amountConverterPipe.transform(newAmount(maxStake).blockchain(metadata.units).value, { protocol: adapter })
          })
        }

        if (isStaking && isFollowing) {
          return this.translateService.instant('delegation-detail-icp.stake-and-follow.staking-following_text', {
            neuronBalance: await this.amountConverterPipe.transform(delegatorDetails.subaccountBalance, { protocol: adapter }),
            maxStake: await this.amountConverterPipe.transform(newAmount(maxStake).blockchain(metadata.units).value, { protocol: adapter })
          })
        }
      }

      return ''
    }

    const getMinAmount = (action: DelegatorAction): Amount<ICPUnits> => {
      if (action.type === ICPStakingActionType.STAKE_AND_FOLLOW) {
        return isStaking ? newAmount(0, 'blockchain') : newAmount(1, 'ICP')
      }

      return newAmount(1, 'blockchain')
    }

    const getMaxAmount = (_action: DelegatorAction) => {
      return maxStake
    }

    return this.createMainDelegatorAction(
      adapter,
      metadata,
      delegatorDetails.availableActions ?? [],
      [ICPStakingActionType.STAKE_AND_FOLLOW],
      async (_) => 'delegation-detail-icp.stake-and-follow.label',
      getDescription,
      {
        followee,

        getMinAmount,
        getMaxAmount,

        minDelay: new BigNumber(delegatorDetails.dissolveDelay ?? 0),
        maxDelay: new BigNumber(8 * 365.25 * 24 * 3600) /* 8 years */
      }
    )
  }

  private async createFollowAction(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    metadata: ProtocolMetadata<ICPUnits>,
    delegatorDetails: ICPDelegatorDetails,
    followee: string
  ): Promise<AirGapDelegatorAction | null> {
    return this.createMainDelegatorAction(
      adapter,
      metadata,
      delegatorDetails.availableActions ?? [],
      [ICPStakingActionType.FOLLOW],
      async (_) => 'delegation-detail-icp.follow.label',
      async (_) => 'delegation-detail-icp.follow.text',
      { followee }
    )
  }

  private async createIncreaseDissolveDelayAction(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    metadata: ProtocolMetadata<ICPUnits>,
    delegatorDetails: ICPDelegatorDetails
  ): Promise<AirGapDelegatorAction | null> {
    const dissolveDelay = delegatorDetails.dissolveDelay ?? '0'
    const humanizedDissolveDelay = humanizeDuration(dissolveDelay, {
      units: new BigNumber(dissolveDelay).gte(24 * 3600) ? ['y', 'd'] : ['h', 'm', 's'],
      round: true,
      unitMeasures: {
        y: 365 * 24 * 3600,
        d: 24 * 3600,
        h: 3600,
        m: 60,
        s: 1
      }
    })

    const maxDissolveDelay = new BigNumber(8 * 365.25 * 24 * 3600) /* 8 years */
    const humanizedMaxDissolveDelay = humanizeDuration(maxDissolveDelay.toString(), {
      units: ['y', 'mo', 'd'],
      round: true,
      unitMeasures: {
        y: 365 * 24 * 3600,
        mo: 30 * 24 * 3600,
        d: 24 * 3600,
        h: 3600,
        m: 60,
        s: 1
      },
      largest: 2
    })

    return this.createMainDelegatorAction(
      adapter,
      metadata,
      delegatorDetails.availableActions ?? [],
      [ICPStakingActionType.INCREASE_DISSOLVE_DELAY],
      async (_) => 'delegation-detail-icp.increase-dissolve-delay.label',
      async (_) => this.translateService.instant('delegation-detail-icp.increase-dissolve-delay.text', {
        dissolveDelay: humanizedDissolveDelay,
        maxDissolveDelay: humanizedMaxDissolveDelay
      }),
      { 
        minDelay: new BigNumber(delegatorDetails.dissolveDelay ?? 0),
        maxDelay: maxDissolveDelay
      }
    )
  }

  private async createMoreDetailsAction(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    metadata: ProtocolMetadata<ICPUnits>,
    delegatorDetails: ICPDelegatorDetails
  ): Promise<AirGapDelegatorAction | null> {
    return this.createMainDelegatorAction(
      adapter,
      metadata,
      delegatorDetails.availableActions ?? [],
      [ICPStakingActionType.GET_STAKING_DETAILS],
      async (_) => 'delegation-detail-icp.more-details.label',
      async (_) => 'delegation-detail-icp.more-details.text'
    )
  }

  private createDisburseAction(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    metadata: ProtocolMetadata<ICPUnits>,
    delegatorDetails: ICPDelegatorDetails
  ): Promise<AirGapDelegatorAction | null> {
    return this.createMainDelegatorAction(
      adapter,
      metadata,
      delegatorDetails.availableActions ?? [],
      [ICPStakingActionType.DISBURSE_AND_UNFOLLOW],
      async (_) => 'delegation-detail-icp.disburse.label',
      async (_) => 'delegation-detail-icp.disburse.text'
    )
  }

  private createStartDissolvingAction(delegatorDetails: ICPDelegatorDetails): AirGapDelegatorAction | null {
    if (delegatorDetails.availableActions?.find((action) => action.type === ICPStakingActionType.START_DISSOLVING)) {
      return {
        type: ICPStakingActionType.START_DISSOLVING,
        label: 'delegation-detail-icp.start-dissolving.label',
        iconName: 'close-outline'
      }
    }

    return null
  }

  private createStopDissolvingAction(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    metadata: ProtocolMetadata<ICPUnits>,
    delegatorDetails: ICPDelegatorDetails
  ): Promise<AirGapDelegatorAction | null> {
    const dissolveDelay = delegatorDetails.dissolveDelay ?? '0'
    const humanizedDissolveDelay = humanizeDuration(dissolveDelay, {
      units: new BigNumber(dissolveDelay).gte(24 * 3600) ? ['y', 'd'] : ['h', 'm', 's'],
      round: true,
      unitMeasures: {
        y: 365 * 24 * 3600,
        d: 24 * 3600,
        h: 3600,
        m: 60,
        s: 1
      }
    })

    return this.createMainDelegatorAction(
      adapter,
      metadata,
      delegatorDetails.availableActions ?? [],
      [ICPStakingActionType.STOP_DISSOLVING],
      async (_) => 'delegation-detail-icp.stop-dissolving.label',
      async (_) => this.translateService.instant('delegation-detail-icp.stop-dissolving.text', {
        dissolveDelay: humanizedDissolveDelay
      })
    )
  }

  // tslint:disable-next-line: cyclomatic-complexity
  private async createMainDelegatorAction(
    adapter: ICoinDelegateProtocolAdapter<ICPProtocol>,
    metadata: ProtocolMetadata<ICPUnits>,
    availableActions: DelegatorAction[],
    types: ICPStakingActionType[],
    getLabel: (action: DelegatorAction) => Promise<string>,
    getDescription: (action: DelegatorAction) => Promise<string>,
    configuration: {
      followee?: string

      getMinAmount?: (action: DelegatorAction) => Amount<ICPUnits>
      getMaxAmount?: (action: DelegatorAction) => Amount<ICPUnits>
      getDefaultAmountType?: (action: DelegatorAction) => DefaultAmountType

      minDelay?: BigNumber
      fixedMinDelay?: BigNumber
      maxDelay?: BigNumber
    } = {}
  ): Promise<AirGapDelegatorAction | null> {
    const action = availableActions.find((action) => types.includes(action.type))
    if (!action) {
      return null
    }

    const { 
      followee: neuronIdArgName, 
      amount: amountArgName, 
      amountControl: amountControlArgName,
      delay: delayArgName,
      delayControl: delayControlArgName
    } = this.resolveMainArgumentNames(action.type)

    const followee = configuration.followee

    const minAmount = configuration.getMinAmount ? configuration.getMinAmount(action) : undefined
    const maxAmount = configuration.getMaxAmount ? configuration.getMaxAmount(action) : undefined
    const defaultAmountType: DefaultAmountType = configuration.getDefaultAmountType ? configuration.getDefaultAmountType(action) : 'max'

    const minDelay = configuration.minDelay
    const fixedMinDelay = configuration.fixedMinDelay ?? minDelay
    const maxDelay = configuration.maxDelay

    let controls = {}

    if (neuronIdArgName) {
      if (followee === undefined) {
        return null
      }

      controls = Object.assign(controls, {
        [neuronIdArgName]: followee
      })
    }
    const inputWidgets: UIInputWidget<any>[] = []

    if (amountArgName && amountControlArgName) {
      const minBlockchainAmount = minAmount ? newAmount(minAmount).blockchain(metadata.units) : undefined
      const maxBlockchainAmount = maxAmount ? newAmount(maxAmount).blockchain(metadata.units) : undefined

      if (minAmount === undefined || maxAmount === undefined || maxBlockchainAmount.toBigNumber().lt(minBlockchainAmount.toBigNumber())) {
        return null
      }

      const minAmountFormatted = newAmount(minAmount).convert('ICP', metadata.units).value
      const maxAmountFormatted = newAmount(maxAmount).convert('ICP', metadata.units).value

      const defaultBlockchainAmount = defaultAmountType === 'min' ? minBlockchainAmount : maxBlockchainAmount
      const defaultAmountFormatted = defaultAmountType === 'min' ? minAmountFormatted : maxAmountFormatted

      controls = Object.assign(controls, {
        [amountArgName]: defaultBlockchainAmount.value,
        [amountControlArgName]: [
          defaultAmountFormatted,
          Validators.compose([
            Validators.required,
            Validators.min(new BigNumber(minAmountFormatted).toNumber()),
            Validators.max(new BigNumber(maxAmountFormatted).toNumber()),
            DecimalValidator.validate(adapter.decimals)
          ])
        ]
      })
      inputWidgets.push(
        this.createAmountWidget(amountControlArgName, maxAmountFormatted, minAmountFormatted, {
          onValueChanged: (value: string) => {
            form.patchValue({ [amountArgName]: new BigNumber(value).shiftedBy(adapter.decimals).toFixed() })
          },
          defaultValue: defaultAmountFormatted
        })
      )
    }

    if (delayArgName && delayControlArgName) {
      if (maxDelay === undefined || minDelay === undefined || maxDelay.lt(minDelay)) {
        return null
      }

      const minDelayEligibleForRewardsDays = new BigNumber(6 * 30) // 6 months
      const minDelayEligibleForRewards = minDelayEligibleForRewardsDays.times(24 * 3600)

      const minDelayDays = minDelay.div(24 * 3600)
      const fixedMinDelayDays = BigNumber.max(fixedMinDelay.div(24 * 3600), minDelayEligibleForRewardsDays)
      const maxDelayDays = maxDelay.div(24 * 3600)

      const votingPowerMultiplier = new BigNumber(1).div(maxDelay)

      controls = Object.assign(controls, {
        [delayArgName]: fixedMinDelay.toString(),
        [delayControlArgName]: [
          fixedMinDelayDays.toFixed(0, BigNumber.ROUND_CEIL),
          Validators.compose([
            Validators.required,
            Validators.min(minDelayDays.toNumber()),
            Validators.max(maxDelayDays.toNumber()),
            DecimalValidator.validate(0)
          ])
        ]
      })

      const humanizedMinDelayEligibleForRewardsInDays = humanizeDuration(minDelayEligibleForRewardsDays.toFixed(0, BigNumber.ROUND_CEIL), {
        units: ['d'],
        unitMeasures: {
          d: 1
        }
      })
      const humanizedMinDelayEligibleForRewards = humanizeDuration(minDelayEligibleForRewardsDays.toFixed(0, BigNumber.ROUND_CEIL), {
        units: ['y', 'mo', 'd'],
        round: true,
        unitMeasures: {
          y: 365,
          mo: 30,
          d: 1
        },
        largest: 2
      })

      const humanizedFixedMinDelayInDays = humanizeDuration(fixedMinDelayDays.toFixed(0, BigNumber.ROUND_CEIL), {
        units: ['d'],
        unitMeasures: {
          d: 1
        }
      })
      const humanizedFixedMinDelay = humanizeDuration(fixedMinDelayDays.toFixed(0, BigNumber.ROUND_CEIL), {
        units: ['y', 'mo', 'd'],
        round: true,
        unitMeasures: {
          y: 365,
          mo: 30,
          d: 1
        },
        largest: 2
      })

      const humanizedMaxDelayInDays = humanizeDuration(maxDelayDays.toFixed(0, BigNumber.ROUND_CEIL), {
        units: ['d'],
        unitMeasures: {
          d: 1
        }
      })
      const humanizedMaxDelay = humanizeDuration(maxDelayDays.toFixed(0, BigNumber.ROUND_CEIL), {
        units: ['y', 'mo', 'd'],
        round: true,
        unitMeasures: {
          y: 365,
          mo: 30,
          d: 1
        },
        largest: 2
      })

      inputWidgets.push(
        new UIInputDelay({
          id: delayControlArgName,
          label: 'delegation-detail-icp.form.dissolve-delay.label',
          inputType: 'days',
          minValue: minDelayDays.toFixed(0, BigNumber.ROUND_CEIL),
          fixedMinValue: fixedMinDelayDays.toFixed(0, BigNumber.ROUND_CEIL),
          maxValue: maxDelayDays.toFixed(0, BigNumber.ROUND_CEIL),
          createExtraLabel: (value: string) => {
            const currentDelayDays = new BigNumber(value)
            if (currentDelayDays.isNaN()) {
              return ''
            }

            const duration = humanizeDuration(value, {
              units: ['y', 'mo', 'd'],
              round: true,
              unitMeasures: {
                y: 365,
                mo: 30,
                d: 1
              },
              largest: 2
            })

            const currentDelay = currentDelayDays.times(24 * 3600)
            if (currentDelay.lt(minDelay) || currentDelay.gt(maxDelay)) {
              return ''
            }

            const currentVotingPowerMultiplier = currentDelay.gte(minDelayEligibleForRewards) ? votingPowerMultiplier : new BigNumber(0)

            const currentVotingPower = currentDelay.times(currentVotingPowerMultiplier).plus(1)

            const label = currentDelay.gte(minDelayEligibleForRewards)
              ? 'delegation-detail-icp.form.dissolve-delay.extra-label'
              : 'delegation-detail-icp.form.dissolve-delay.extra-label-no-rewards'

            return this.translateService.instant(label, {
              minDelay: `${humanizedMinDelayEligibleForRewards} (${humanizedMinDelayEligibleForRewardsInDays})`,
              duration,
              votingPower: currentVotingPower.toFixed(2, BigNumber.ROUND_HALF_FLOOR)
            })
          },
          onValueChanged: (value: string) => {
            form.patchValue({ [delayArgName]: new BigNumber(value).times(24 * 3600).toString() })
          },
          errorLabel: fixedMinDelay.gt(minDelayEligibleForRewards)
            ? this.translateService.instant('delegation-detail-icp.form.dissolve-delay.invalid-decrease', {
                minDelay: `${humanizedFixedMinDelay} (${humanizedFixedMinDelayInDays})`,
                maxDelay: `${humanizedMaxDelay} (${humanizedMaxDelayInDays})`
              })
            : this.translateService.instant('delegation-detail-icp.form.dissolve-delay.invalid-state', {
                minDelay: `${humanizedMinDelayEligibleForRewards} (${humanizedMinDelayEligibleForRewardsInDays})`,
                maxDelay: `${humanizedMaxDelay} (${humanizedMaxDelayInDays})`
              })
        })
      )
    }

    const form = this.formBuilder.group(controls)
    const [label, description] = await Promise.all([getLabel(action), getDescription(action)])

    return {
      type: action.type,
      form,
      label,
      description,
      args: inputWidgets
    }
  }

  private resolveMainArgumentNames(mainAction: ICPStakingActionType): { followee?: string; amount?: string; amountControl?: string; delay?: string; delayControl?: string } {
    switch (mainAction) {
      case ICPStakingActionType.STAKE_AND_FOLLOW:
        return {
          followee: ArgumentName.FOLLOWEE,
          amount: ArgumentName.AMOUNT,
          amountControl: ArgumentName.AMOUNT_CONTROL,
          delay: ArgumentName.DISSOLVE_DELAY,
          delayControl: ArgumentName.DISSOLVE_DELAY_CONTROL
        }
      case ICPStakingActionType.FOLLOW:
        return {
          followee: ArgumentName.FOLLOWEE
        }
      case ICPStakingActionType.INCREASE_DISSOLVE_DELAY:
        return {
          delay: ArgumentName.DISSOLVE_DELAY,
          delayControl: ArgumentName.DISSOLVE_DELAY_CONTROL
        }
      default:
        return {}
    }
  }
}
