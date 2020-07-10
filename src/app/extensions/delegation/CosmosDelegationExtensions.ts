import { CosmosProtocol } from 'airgap-coin-lib'
import { ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'
import {
  AirGapDelegationDetails,
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { DecimalPipe } from '@angular/common'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { DelegateeDetails, DelegatorDetails, DelegatorAction } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import BigNumber from 'bignumber.js'
import { CosmosValidator, CosmosUnbondingDelegation } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { CosmosDelegationActionType } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosProtocol'
import { FormBuilder, Validators } from '@angular/forms'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'
import { UIAccountExtendedDetails, UIAccountExtendedDetailsItem } from 'src/app/models/widgets/display/UIAccountExtendedDetails'
import { RemoteConfigProvider, CosmosValidatorDetails } from 'src/app/services/remote-config/remote-config'
import { TranslateService } from '@ngx-translate/core'

enum ArgumentName {
  VALIDATOR = 'validator',
  AMOUNT = 'amount',
  AMOUNT_CONTROL = 'amountControl'
}

export class CosmosDelegationExtensions extends ProtocolDelegationExtensions<CosmosProtocol> {
  private static instance: CosmosDelegationExtensions

  public static create(
    remoteConfigProvider: RemoteConfigProvider,
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverterPipe: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe,
    translateService: TranslateService
  ): CosmosDelegationExtensions {
    if (!CosmosDelegationExtensions.instance) {
      CosmosDelegationExtensions.instance = new CosmosDelegationExtensions(
        remoteConfigProvider,
        formBuilder,
        decimalPipe,
        amountConverterPipe,
        shortenStringPipe,
        translateService
      )
    }

    return CosmosDelegationExtensions.instance
  }

  public airGapDelegatee?: string = 'cosmosvaloper1n3f5lm7xtlrp05z9ud2xk2cnvk2xnzkm2he6er'

  public delegateeLabel: string = 'delegation-detail-cosmos.delegatee-label'
  public delegateeLabelPlural: string = 'delegation-detail-cosmos.delegatee-label-plural'
  public supportsMultipleDelegations: boolean = true

  private knownValidators?: CosmosValidatorDetails[]

  private constructor(
    private readonly remoteConfigProvider: RemoteConfigProvider,
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService
  ) {
    super()
  }

  public async getExtraDelegationDetailsFromAddress(
    protocol: CosmosProtocol,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const delegationsDetails = await Promise.all(
      delegatees.map(validator => protocol.getDelegationDetailsFromAddress(delegator, [validator]))
    )
    return Promise.all(
      delegationsDetails.map(async details => {
        const [delegator, validator] = await Promise.all([
          this.getExtraDelegatorDetails(protocol, details.delegator, details.delegatees[0].address),
          this.getExtraValidatorDetails(protocol, details.delegatees[0])
        ])

        return {
          delegator,
          delegatees: [validator]
        }
      })
    )
  }

  public async createDelegateesSummary(protocol: CosmosProtocol, delegatees: string[]): Promise<UIAccountSummary[]> {
    const knownValidators: CosmosValidatorDetails[] = await this.getKnownValidators()
    const knownValidatorAddresses: string[] = knownValidators.map((validator: CosmosValidatorDetails) => validator.operator_address)

    const unkownValidators: CosmosValidator[] = await Promise.all(
      delegatees
        .filter((address: string) => !knownValidatorAddresses.includes(address))
        .map((address: string) => protocol.fetchValidator(address))
    )

    type ValidatorDetails = CosmosValidatorDetails | (CosmosValidator & Pick<CosmosValidatorDetails, 'logo'>)

    return [...knownValidators, ...unkownValidators]
      .sort((a: ValidatorDetails, b: ValidatorDetails) => a.description.moniker.localeCompare(b.description.moniker))
      .map(
        (details: ValidatorDetails) =>
          new UIAccountSummary({
            address: details.operator_address,
            logo: details.logo,
            header: [
              details.description.moniker,
              `${this.decimalPipe.transform(new BigNumber(details.commission.commission_rates.rate).times(100).toString())}%`
            ],
            description: [
              this.shortenStringPipe.transform(details.operator_address),
              this.amountConverterPipe.transform(details.tokens, {
                protocolIdentifier: protocol.identifier,
                maxDigits: 10
              })
            ]
          })
      )
  }

  public async createAccountExtendedDetails(protocol: CosmosProtocol, address: string): Promise<UIAccountExtendedDetails> {
    const results = await Promise.all([
      protocol.getAvailableBalanceOfAddresses([address]),
      protocol.fetchTotalDelegatedAmount(address),
      protocol.fetchTotalUnbondingAmount(address),
      protocol.fetchTotalReward(address)
    ])
    const items: UIAccountExtendedDetailsItem[] = [
      {
        label: 'account-transaction-detail.available_label',
        text: `${this.amountConverterPipe.transformValueOnly(results[0], { protocol: protocol, maxDigits: 0 })} ${protocol.symbol}`
      },
      {
        label: 'account-transaction-detail.delegated_label',
        text: `${this.amountConverterPipe.transformValueOnly(results[1], { protocol: protocol, maxDigits: 0 })} ${protocol.symbol}`
      },
      {
        label: 'account-transaction-detail.unbonding_label',
        text: `${this.amountConverterPipe.transformValueOnly(results[2], { protocol: protocol, maxDigits: 0 })} ${protocol.symbol}`
      },
      {
        label: 'account-transaction-detail.reward_label',
        text: `${this.amountConverterPipe.transformValueOnly(results[3], { protocol: protocol, maxDigits: 0 })} ${protocol.symbol}`
      }
    ]
    return new UIAccountExtendedDetails({
      items: items
    })
  }

  private async getExtraValidatorDetails(protocol: CosmosProtocol, validatorDetails: DelegateeDetails): Promise<AirGapDelegateeDetails> {
    const results = await Promise.all([
      protocol.nodeClient.fetchValidator(validatorDetails.address),
      protocol.fetchSelfDelegation(validatorDetails.address),
      this.getKnownValidators()
    ])

    const allDetails = results[0]
    const selfDelegation = results[1]
    const knownValidators = results[2]

    const knownValidator = knownValidators.find(
      (validator: CosmosValidatorDetails) => validator.operator_address === validatorDetails.address
    )

    const currentUsage = new BigNumber(selfDelegation.shares)
    const totalUsage = new BigNumber(allDetails.tokens)

    const displayDetails = await this.createValidatorDisplayDetails(protocol, allDetails)

    return {
      ...validatorDetails,
      logo: knownValidator ? knownValidator.logo : undefined,
      usageDetails: {
        usage: currentUsage.div(totalUsage),
        current: currentUsage,
        total: totalUsage
      },
      displayDetails
    }
  }

  private async createValidatorDisplayDetails(protocol: CosmosProtocol, validatorDetails: CosmosValidator): Promise<UIWidget[]> {
    const details = []

    const votingPower = await this.fetchVotingPower(protocol, validatorDetails.operator_address)

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

  private async fetchVotingPower(protocol: CosmosProtocol, address: string): Promise<BigNumber> {
    const validators = await protocol.fetchValidators()
    const validatedAmount = new BigNumber(validators.find(validator => validator.operator_address === address).delegator_shares)
    const totalDelegatedAmount = new BigNumber(validators.map(validator => parseFloat(validator.delegator_shares)).reduce((a, b) => a + b))

    return validatedAmount.div(totalDelegatedAmount)
  }

  private async getExtraDelegatorDetails(
    protocol: CosmosProtocol,
    delegatorDetails: DelegatorDetails,
    validator: string
  ): Promise<AirGapDelegatorDetails> {
    const [delegations, unbondingDelegations, availableBalance, rewards] = await Promise.all([
      protocol.fetchDelegations(delegatorDetails.address),
      protocol.fetchUnbondingDelegations(delegatorDetails.address),
      protocol.getAvailableBalanceOfAddresses([delegatorDetails.address]).then(availableBalance => new BigNumber(availableBalance)),
      protocol
        .fetchRewardForDelegation(delegatorDetails.address, validator)
        .then(rewards => new BigNumber(rewards))
        .catch(() => new BigNumber(0))
    ])

    const delegatedAmount = new BigNumber(
      delegatorDetails.delegatees.includes(validator)
        ? delegations.find(delegation => delegation.validator_address === validator).balance
        : 0
    )

    const unbondingAmount = unbondingDelegations
      .filter((unbonding: CosmosUnbondingDelegation) => unbonding.validator_address === validator)
      .map((unbonding: CosmosUnbondingDelegation) => unbonding.entries)
      .reduce((flatten, toFlatten) => flatten.concat(toFlatten), [])
      .reduce((sum, next) => sum.plus(next.balance), new BigNumber(0))

    const delegateAction = this.createDelegateAction(protocol, delegatorDetails, validator, availableBalance, delegatedAmount)
    const undelegateAction = this.createUndelegateAction(protocol, delegatorDetails, validator, delegatedAmount)
    const extraActions = await this.createExtraActions(protocol, delegatorDetails.availableActions, validator, rewards)

    const displayDetails = this.createDisplayDetails(protocol, delegatedAmount, unbondingAmount, rewards)

    return {
      ...delegatorDetails,
      mainActions: [delegateAction, undelegateAction, ...extraActions].filter(action => !!action),
      displayDetails
    }
  }

  private createDelegateAction(
    protocol: CosmosProtocol,
    delegatorDetails: DelegatorDetails,
    validator: string,
    availableBalance: BigNumber,
    delegatedAmount: BigNumber
  ): AirGapDelegatorAction | null {
    const requiredFee = new BigNumber(protocol.feeDefaults.low).shiftedBy(protocol.feeDecimals)
    const maxDelegationAmount = availableBalance.minus(requiredFee.times(2))

    const delegatedFormatted = this.amountConverterPipe.transform(delegatedAmount, {
      protocolIdentifier: protocol.identifier,
      maxDigits: 10
    })

    const maxDelegationFormatted = this.amountConverterPipe.transform(maxDelegationAmount, {
      protocolIdentifier: protocol.identifier,
      maxDigits: 10
    })

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
      protocol,
      delegatorDetails.availableActions,
      validator,
      [CosmosDelegationActionType.DELEGATE],
      'delegation-detail-cosmos.delegate.label',
      maxDelegationAmount,
      new BigNumber(1),
      baseDescription + extraDescription
    )
  }

  private createUndelegateAction(
    protocol: CosmosProtocol,
    delegatorDetails: DelegatorDetails,
    validator: string,
    delegatedAmount: BigNumber
  ): AirGapDelegatorAction | null {
    const delegatedAmountFormatted = this.amountConverterPipe.transform(delegatedAmount, {
      protocolIdentifier: protocol.identifier,
      maxDigits: 10
    })
    const description = this.translateService.instant('delegation-detail-cosmos.undelegate.text', { delegated: delegatedAmountFormatted })

    return this.createMainDelegatorAction(
      protocol,
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
    protocol: CosmosProtocol,
    availableActions: DelegatorAction[],
    validator: string,
    types: CosmosDelegationActionType[],
    label: string,
    maxAmount: BigNumber,
    minAmount: BigNumber,
    description: string
  ): AirGapDelegatorAction | null {
    const action = availableActions.find(action => types.includes(action.type))

    if (action && maxAmount.gte(minAmount)) {
      const maxAmountFormatted = this.amountConverterPipe.formatBigNumber(
        maxAmount.shiftedBy(-protocol.decimals).decimalPlaces(protocol.decimals),
        10
      )

      const form = this.formBuilder.group({
        [ArgumentName.VALIDATOR]: validator,
        [ArgumentName.AMOUNT]: maxAmount.toString(),
        [ArgumentName.AMOUNT_CONTROL]: [
          maxAmountFormatted,
          Validators.compose([
            Validators.required,
            Validators.min(new BigNumber(minAmount).shiftedBy(-protocol.decimals).toNumber()),
            Validators.max(new BigNumber(maxAmountFormatted).toNumber()),
            DecimalValidator.validate(protocol.decimals)
          ])
        ]
      })

      return {
        type: action.type,
        form,
        label,
        description,
        args: [
          this.createAmountWidget(ArgumentName.AMOUNT_CONTROL, maxAmountFormatted, {
            onValueChanged: (value: string) => {
              form.patchValue({ [ArgumentName.AMOUNT]: new BigNumber(value).shiftedBy(protocol.decimals).toFixed() })
            }
          })
        ]
      }
    }

    return null
  }

  private async createExtraActions(
    protocol: CosmosProtocol,
    availableActions: DelegatorAction[],
    validator: string,
    rewards: BigNumber
  ): Promise<AirGapDelegatorAction[]> {
    const mainActionTypes = [CosmosDelegationActionType.DELEGATE, CosmosDelegationActionType.UNDELEGATE]
    const excludedActionTypes = [CosmosDelegationActionType.WITHDRAW_ALL_REWARDS]
    return Promise.all(
      availableActions
        .filter(action => !mainActionTypes.includes(action.type) && !excludedActionTypes.includes(action.type))
        .map(async action => {
          let partial = {}
          switch (action.type) {
            case CosmosDelegationActionType.WITHDRAW_VALIDATOR_REWARDS:
              partial = await this.createWithdrawRewardsAction(protocol, validator, rewards)
              break
            default:
              partial = {}
              break
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
    protocol: CosmosProtocol,
    validator: string,
    rewards: BigNumber
  ): Promise<Partial<AirGapDelegatorAction>> {
    const form = this.formBuilder.group({
      [ArgumentName.VALIDATOR]: validator
    })

    const rewardsFormatted = this.amountConverterPipe.transform(rewards, {
      protocolIdentifier: protocol.identifier,
      maxDigits: 10
    })

    return {
      label: 'delegation-detail-cosmos.rewards.label',
      confirmLabel: 'delegation-detail-cosmos.rewards.button',
      form,
      description: this.translateService.instant('delegation-detail-cosmos.rewards.text', { rewards: rewardsFormatted })
    }
  }

  private createDisplayDetails(
    protocol: CosmosProtocol,
    delegatedAmount: BigNumber,
    unbondingAmount: BigNumber,
    rewards: BigNumber
  ): UIWidget[] {
    const details = []

    if (delegatedAmount.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: this.amountConverterPipe.transform(delegatedAmount, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'delegation-detail-cosmos.currently-delegated_label'
        })
      )
    }

    if (unbondingAmount.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: this.amountConverterPipe.transform(unbondingAmount, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'delegation-detail-cosmos.unbonding_label'
        })
      )
    }

    if (rewards.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: this.amountConverterPipe.transform(rewards, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'delegation-detail-cosmos.unclaimed-rewards_label'
        })
      )
    }

    return details
  }

  private async getKnownValidators(): Promise<CosmosValidatorDetails[]> {
    if (this.knownValidators === undefined) {
      this.knownValidators = await this.remoteConfigProvider.getKnownCosmosValidators()
    }

    return this.knownValidators
  }
}
