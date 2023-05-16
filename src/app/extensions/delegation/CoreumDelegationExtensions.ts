import { AmountConverterPipe, ICoinDelegateProtocolAdapter } from '@airgap/angular-core'
import { DelegateeDetails, DelegatorAction, DelegatorDetails } from '@airgap/coinlib-core/protocols/ICoinDelegateProtocol'
import { CoreumProtocol } from '@airgap/coreum'
import { CosmosDelegationActionType, CosmosUnbondingDelegation, CosmosValidator } from '@airgap/cosmos'
import { DecimalPipe } from '@angular/common'
import { FormBuilder, Validators } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import BigNumber from 'bignumber.js'
import * as moment from 'moment'
import {
  AirGapDelegateeDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction,
  AirGapDelegatorDetails
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountExtendedDetails, UIAccountExtendedDetailsItem } from 'src/app/models/widgets/display/UIAccountExtendedDetails'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { CosmosValidatorDetails } from 'src/app/services/coinlib/coinlib.service'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'

import { V1ProtocolDelegationExtensions } from './base/V1ProtocolDelegationExtensions'

enum ArgumentName {
  VALIDATOR = 'validator',
  AMOUNT = 'amount',
  AMOUNT_CONTROL = 'amountControl'
}

export class CoreumDelegationExtensions extends V1ProtocolDelegationExtensions<CoreumProtocol> {
  private static instance: CoreumDelegationExtensions

  public static create(
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverterPipe: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe,
    translateService: TranslateService
  ): CoreumDelegationExtensions {
    if (!CoreumDelegationExtensions.instance) {
      CoreumDelegationExtensions.instance = new CoreumDelegationExtensions(
        formBuilder,
        decimalPipe,
        amountConverterPipe,
        shortenStringPipe,
        translateService
      )
    }

    return CoreumDelegationExtensions.instance
  }

  public delegateeLabel: string = 'delegation-detail-cosmos.delegatee-label'
  public delegateeLabelPlural: string = 'delegation-detail-cosmos.delegatee-label-plural'
  public supportsMultipleDelegations: boolean = true

  private constructor(
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService
  ) {
    super()
  }

  public airGapDelegatee(_protocol: ICoinDelegateProtocolAdapter<CoreumProtocol>): string | undefined {
    return 'corevaloper1xprcq3xdcuht0a8p082l3srgtwfgl57h2avmsq'
  }


  public async getExtraDelegationDetailsFromAddress(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    _publicKey: string,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const delegationsDetails = await Promise.all(
      delegatees.map((validator) => adapter.getDelegationDetailsFromAddress(delegator, [validator]))
    )

    return Promise.all(
      delegationsDetails.map(async (details) => {
        const [delegator, validator] = await Promise.all([
          this.getExtraDelegatorDetails(adapter, details.delegator, details.delegatees[0].address),
          this.getExtraValidatorDetails(adapter, details.delegatees[0])
        ])

        return {
          delegator,
          delegatees: [validator]
        }
      })
    )
  }

  public async createDelegateesSummary(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    delegatees: string[]
  ): Promise<UIAccountSummary[]> {
    const unkownValidators: CosmosValidator[] = await Promise.all(
      delegatees.map((address: string) => adapter.protocolV1.fetchValidator(address))
    )

    type ValidatorDetails = CosmosValidatorDetails | (CosmosValidator & Pick<CosmosValidatorDetails, 'logo'>)

    const isNullOrUndefined = (value: any) => value === undefined || value === null

    return Promise.all(
      unkownValidators
        .sort((a: ValidatorDetails, b: ValidatorDetails) => {
          if (!isNullOrUndefined(a.description.moniker) && !isNullOrUndefined(b.description.moniker)) {
            return a.description.moniker.localeCompare(b.description.moniker)
          } else if (isNullOrUndefined(a.description.moniker) && !isNullOrUndefined(b.description.moniker)) {
            return 1
          } else if (!isNullOrUndefined(a.description.moniker) && isNullOrUndefined(b.description.moniker)) {
            return -1
          } else if (isNullOrUndefined(a.description.moniker) && isNullOrUndefined(b.description.moniker)) {
            return a.operator_address.localeCompare(b.operator_address)
          }
          return 0
        })
        .map(
          async (details: ValidatorDetails) =>
            new UIAccountSummary({
              address: details.operator_address,
              logo: details.logo,
              header: [
                details.description.moniker,
                `${this.decimalPipe.transform(new BigNumber(details.commission.commission_rates.rate).times(100).toString())}%`
              ],
              description: [
                this.shortenStringPipe.transform(details.operator_address),
                await this.amountConverterPipe.transform(details.tokens, { protocol: adapter })
              ]
            })
        )
    )
  }

  public async createAccountExtendedDetails(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    _publicKey: string,
    address: string
  ): Promise<UIAccountExtendedDetails> {
    const results = await Promise.all([
      adapter.getAvailableBalanceOfAddresses([address]),
      adapter.protocolV1.fetchTotalDelegatedAmount(address),
      adapter.protocolV1.fetchTotalUnbondingAmount(address),
      adapter.protocolV1.fetchTotalReward(address),
      adapter.protocolV1.fetchUnbondingDelegations(address)
    ])

    const unbondingDetails = results[4]
      .map((unbonding) => unbonding.entries)
      .reduce((flatten, toFlatten) => flatten.concat(toFlatten), [])
      .map((entry) => {
        const completionTime = moment(entry.completion_time, 'YYYY-MM-DD hh:mm:ss Z').format('hh:ss MM/DD/YYYY')
        return { balance: entry.balance, completionTime }
      })

    const items: UIAccountExtendedDetailsItem[] = [
      {
        label: 'account-transaction-detail.available_label',
        text: `${await this.amountConverterPipe.transformValueOnly(results[0], adapter, 0)} ${adapter.symbol}`
      },
      {
        label: 'account-transaction-detail.delegated_label',
        text: `${await this.amountConverterPipe.transformValueOnly(results[1].value, adapter, 0)} ${adapter.symbol}`
      },
      {
        label: 'account-transaction-detail.unbonding_label',
        text: `${await this.amountConverterPipe.transformValueOnly(results[2].value, adapter, 0)} ${adapter.symbol}`
      },
      {
        label: 'account-transaction-detail.reward_label',
        text: `${await this.amountConverterPipe.transformValueOnly(results[3].value, adapter, 0)} ${adapter.symbol}`
      }
    ]

    const unbondingCompletionItems = await Promise.all(
      unbondingDetails.map(async (unbondingDetail) => {
        return {
          label: 'account-transaction-detail.unbonding_completion',
          text: `${await this.amountConverterPipe.transformValueOnly(unbondingDetail.balance, adapter, 0)} ${adapter.symbol} - ${
            unbondingDetail.completionTime
          }`
        }
      })
    )

    items.splice(3, 0, ...unbondingCompletionItems)

    return new UIAccountExtendedDetails({
      items
    })
  }

  private async getExtraValidatorDetails(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    validatorDetails: DelegateeDetails
  ): Promise<AirGapDelegateeDetails> {
    const results = await Promise.all([
      adapter.protocolV1.fetchValidator(validatorDetails.address),
      adapter.protocolV1.fetchSelfDelegation(validatorDetails.address)
    ])

    const allDetails = results[0]
    const selfDelegation = results[1]

    const currentUsage = new BigNumber(selfDelegation.delegation.shares)
    const totalUsage = new BigNumber(allDetails.tokens)

    const displayDetails = await this.createValidatorDisplayDetails(adapter, allDetails)

    return {
      ...validatorDetails,
      logo: undefined,
      usageDetails: {
        usage: currentUsage.div(totalUsage),
        current: currentUsage,
        total: totalUsage
      },
      displayDetails
    }
  }

  private async createValidatorDisplayDetails(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    validatorDetails: CosmosValidator
  ): Promise<UIWidget[]> {
    const details = []

    const votingPower = await this.fetchVotingPower(adapter.protocolV1, validatorDetails.operator_address)

    const commission = new BigNumber(validatorDetails.commission.commission_rates.rate)
    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: this.decimalPipe.transform(commission.times(100).toString()) + '%',
        description: 'delegation-detail-cosmos.commission_label'
      }),
      new UIIconText({
        iconName: 'sync-outline',
        text: this.decimalPipe.transform(votingPower.times(100).toString(), '1.0-2') + '%',
        description: 'delegation-detail-cosmos.voting-power_label'
      })
    )

    return details
  }

  private async fetchVotingPower(protocol: CoreumProtocol, address: string): Promise<BigNumber> {
    const validators = await protocol.fetchValidators()
    const validator = validators.find((validator) => validator.operator_address === address)
    const validatedAmount = validator ? new BigNumber(validator.delegator_shares) : new BigNumber(0)
    const totalDelegatedAmount = new BigNumber(
      validators.map((validator) => parseFloat(validator.delegator_shares)).reduce((a, b) => a + b)
    )

    return validatedAmount.div(totalDelegatedAmount)
  }

  private async getExtraDelegatorDetails(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    delegatorDetails: DelegatorDetails,
    validator: string
  ): Promise<AirGapDelegatorDetails> {
    const [delegations, unbondingDelegations, availableBalance, rewards] = await Promise.all([
      adapter.protocolV1.fetchDelegations(delegatorDetails.address),
      adapter.protocolV1.fetchUnbondingDelegations(delegatorDetails.address),
      adapter.getAvailableBalanceOfAddresses([delegatorDetails.address]).then((availableBalance) => new BigNumber(availableBalance)),
      adapter.protocolV1
        .fetchRewardForDelegation(delegatorDetails.address, validator)
        .then((rewards) => new BigNumber(rewards.value /* TODO: make sure the unit is correct */))
        .catch(() => new BigNumber(0))
    ])

    const delegatedAmount = new BigNumber(
      delegatorDetails.delegatees.includes(validator)
        ? delegations.find((delegation) => delegation.delegation.validator_address === validator).balance.amount
        : 0
    )

    const unbondingAmount = unbondingDelegations
      .filter((unbonding: CosmosUnbondingDelegation) => unbonding.validator_address === validator)
      .map((unbonding: CosmosUnbondingDelegation) => unbonding.entries)
      .reduce((flatten, toFlatten) => flatten.concat(toFlatten), [])
      .reduce((sum, next) => sum.plus(next.balance), new BigNumber(0))

    const delegateAction = await this.createDelegateAction(adapter, delegatorDetails, validator, availableBalance, delegatedAmount)
    const undelegateAction = await this.createUndelegateAction(adapter, delegatorDetails, validator, delegatedAmount)
    const extraActions = await this.createExtraActions(adapter, delegatorDetails.availableActions, validator, rewards)

    const displayDetails = await this.createDisplayDetails(adapter, delegatedAmount, unbondingAmount, rewards)

    return {
      ...delegatorDetails,
      mainActions: [delegateAction, undelegateAction, ...extraActions].filter((action) => !!action),
      displayDetails
    }
  }

  private async createDelegateAction(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    delegatorDetails: DelegatorDetails,
    validator: string,
    availableBalance: BigNumber,
    delegatedAmount: BigNumber
  ): Promise<AirGapDelegatorAction | null> {
    const requiredFee = new BigNumber(adapter.feeDefaults.low).shiftedBy(adapter.feeDecimals)
    const maxDelegationAmount = availableBalance.minus(requiredFee.times(2))

    const delegatedFormatted = await this.amountConverterPipe.transform(delegatedAmount, { protocol: adapter })

    const maxDelegationFormatted = await this.amountConverterPipe.transform(maxDelegationAmount, { protocol: adapter })

    const hasDelegated = delegatedAmount.gt(0)
    const canDelegate = maxDelegationAmount.gt(0)

    const baseDescription = hasDelegated
      ? this.translateService.instant('delegation-detail-cosmos.delegate.has-delegated_text', { delegated: delegatedFormatted })
      : this.translateService.instant('delegation-detail-cosmos.delegate.not-delegated_text')
    const extraDescription = canDelegate
      ? ` ${this.translateService.instant(
          hasDelegated
            ? 'delegation-detail-cosmos.delegate.can-delegate-has-delegated_text'
            : 'delegation-detail-cosmos.delegate.can-delegate-not-delegated_text',
          { maxDelegation: maxDelegationFormatted }
        )}`
      : ''

    return this.createMainDelegatorAction(
      adapter,
      delegatorDetails.availableActions,
      validator,
      [CosmosDelegationActionType.DELEGATE],
      'delegation-detail-cosmos.delegate.label',
      maxDelegationAmount,
      new BigNumber(1),
      baseDescription + extraDescription
    )
  }

  private async createUndelegateAction(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    delegatorDetails: DelegatorDetails,
    validator: string,
    delegatedAmount: BigNumber
  ): Promise<AirGapDelegatorAction | null> {
    const delegatedAmountFormatted = await this.amountConverterPipe.transform(delegatedAmount, { protocol: adapter })

    const description = this.translateService.instant('delegation-detail-cosmos.undelegate.text', { delegated: delegatedAmountFormatted })

    return this.createMainDelegatorAction(
      adapter,
      delegatorDetails.availableActions,
      validator,
      [CosmosDelegationActionType.UNDELEGATE],
      'delegation-detail-cosmos.undelegate.label',
      delegatedAmount,
      new BigNumber(1),
      description
    )
  }

  private createMainDelegatorAction(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    availableActions: DelegatorAction[],
    validator: string,
    types: CosmosDelegationActionType[],
    label: string,
    maxAmount: BigNumber,
    minAmount: BigNumber,
    description: string
  ): AirGapDelegatorAction | null {
    const action = availableActions.find((action) => types.includes(action.type))

    if (action && maxAmount.gte(minAmount)) {
      const maxAmountFormatted = maxAmount.shiftedBy(-adapter.decimals).decimalPlaces(adapter.decimals).toFixed()

      const minAmountFormatted = minAmount.shiftedBy(-adapter.decimals).decimalPlaces(adapter.decimals).toFixed()

      const form = this.formBuilder.group({
        [ArgumentName.VALIDATOR]: validator,
        [ArgumentName.AMOUNT]: maxAmount.toString(),
        [ArgumentName.AMOUNT_CONTROL]: [
          maxAmountFormatted,
          Validators.compose([
            Validators.required,
            Validators.min(new BigNumber(minAmountFormatted).toNumber()),
            Validators.max(new BigNumber(maxAmountFormatted).toNumber()),
            DecimalValidator.validate(adapter.decimals)
          ])
        ]
      })

      return {
        type: action.type,
        form,
        label,
        description,
        args: [
          this.createAmountWidget(ArgumentName.AMOUNT_CONTROL, maxAmountFormatted, minAmountFormatted, {
            onValueChanged: (value: string) => {
              form.patchValue({ [ArgumentName.AMOUNT]: new BigNumber(value).shiftedBy(adapter.decimals).toFixed() })
            }
          })
        ]
      }
    }

    return null
  }

  private async createExtraActions(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    availableActions: DelegatorAction[],
    validator: string,
    rewards: BigNumber
  ): Promise<AirGapDelegatorAction[]> {
    const mainActionTypes = [CosmosDelegationActionType.DELEGATE, CosmosDelegationActionType.UNDELEGATE]
    const excludedActionTypes = [CosmosDelegationActionType.WITHDRAW_ALL_REWARDS]

    return Promise.all(
      availableActions
        .filter((action) => !mainActionTypes.includes(action.type) && !excludedActionTypes.includes(action.type))
        .map(async (action) => {
          let partial = {}
          switch (action.type) {
            case CosmosDelegationActionType.WITHDRAW_VALIDATOR_REWARDS:
              partial = await this.createWithdrawRewardsAction(adapter, validator, rewards)
              break
            default:
              partial = {}
          }

          return {
            type: action.type,
            label: action.type,
            confirmLabel: action.type,
            ...partial
          }
        })
    )
  }

  private async createWithdrawRewardsAction(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    validator: string,
    rewards: BigNumber
  ): Promise<Partial<AirGapDelegatorAction>> {
    const form = this.formBuilder.group({
      [ArgumentName.VALIDATOR]: validator
    })

    const rewardsFormatted = await this.amountConverterPipe.transform(rewards, {
      protocol: adapter
    })

    return {
      label: 'delegation-detail-cosmos.rewards.label',
      confirmLabel: 'delegation-detail-cosmos.rewards.button',
      form,
      description: this.translateService.instant('delegation-detail-cosmos.rewards.text', { rewards: rewardsFormatted })
    }
  }

  private async createDisplayDetails(
    adapter: ICoinDelegateProtocolAdapter<CoreumProtocol>,
    delegatedAmount: BigNumber,
    unbondingAmount: BigNumber,
    rewards: BigNumber
  ): Promise<UIWidget[]> {
    const details = []

    if (delegatedAmount.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: await this.amountConverterPipe.transform(delegatedAmount, {
            protocol: adapter
          }),
          description: 'delegation-detail-cosmos.currently-delegated_label'
        })
      )
    }

    if (unbondingAmount.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: await this.amountConverterPipe.transform(unbondingAmount, {
            protocol: adapter
          }),
          description: 'delegation-detail-cosmos.unbonding_label'
        })
      )
    }

    if (rewards.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: await this.amountConverterPipe.transform(rewards, {
            protocol: adapter
          }),
          description: 'delegation-detail-cosmos.unclaimed-rewards_label'
        })
      )
    }

    return details
  }
}
