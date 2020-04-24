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
import { CosmosValidator } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosNodeClient'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { CosmosDelegationActionType } from 'airgap-coin-lib/dist/protocols/cosmos/CosmosProtocol'
import { FormBuilder, Validators } from '@angular/forms'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'
import { UIAccountExtendedDetails, UIAccountExtendedDetailsItem } from 'src/app/models/widgets/display/UIAccountExtendedDetails'

enum ArgumentName {
  VALIDATOR = 'validator',
  AMOUNT = 'amount',
  AMOUNT_CONTROL = 'amountControl'
}

export class CosmosDelegationExtensions extends ProtocolDelegationExtensions<CosmosProtocol> {
  private static instance: CosmosDelegationExtensions

  public static create(
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverterPipe: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe
  ): CosmosDelegationExtensions {
    if (!CosmosDelegationExtensions.instance) {
      CosmosDelegationExtensions.instance = new CosmosDelegationExtensions(formBuilder, decimalPipe, amountConverterPipe, shortenStringPipe)
    }

    return CosmosDelegationExtensions.instance
  }

  public airGapDelegatee?: string = 'cosmosvaloper1n3f5lm7xtlrp05z9ud2xk2cnvk2xnzkm2he6er'
  public delegateeLabel: string = 'Validator'

  private constructor(
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly shortenStringPipe: ShortenStringPipe
  ) {
    super()
  }

  // TODO: add translations
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
    const validatorsDetails = await Promise.all(delegatees.map(validator => protocol.fetchValidator(validator)))
    return validatorsDetails.map(
      details =>
        new UIAccountSummary({
          address: details.operator_address,
          header: [
            details.description.moniker,
            this.decimalPipe.transform(new BigNumber(details.commission.commission_rates.rate).times(100).toString()) + '%'
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
      protocol.fetchSelfDelegation(validatorDetails.address)
    ])

    const allDetails = results[0]
    const selfDelegation = results[1]

    const currentUsage = new BigNumber(selfDelegation.shares)
    const totalUsage = new BigNumber(allDetails.tokens)

    const displayDetails = await this.createValidatorDisplayDetails(protocol, allDetails)

    return {
      ...validatorDetails,
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
        description: 'Commission'
      }),
      new UIIconText({
        iconName: 'sync-outline',
        text: this.decimalPipe.transform(votingPower.times(100).toString(), '1.0-2') + '%',
        description: 'Voting Power'
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
    const [delegations, availableBalance, rewards] = await Promise.all([
      protocol.fetchDelegations(delegatorDetails.address),
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
    const totalDelegatedAmount = new BigNumber(delegations.map(delegation => parseFloat(delegation.balance)).reduce((a, b) => a + b, 0))

    const delegateAction = this.createDelegateAction(protocol, delegatorDetails, validator, availableBalance, delegatedAmount)
    const undelegateAction = this.createUndelegateAction(protocol, delegatorDetails, validator, delegatedAmount)
    const extraActions = await this.createExtraActions(protocol, delegatorDetails.availableActions, rewards)

    const displayDetails = this.createDisplayDetails(protocol, totalDelegatedAmount, rewards)

    return {
      ...delegatorDetails,
      mainActions: [delegateAction, undelegateAction, ...extraActions].filter(action => !!action),
      secondaryActions: extraActions,
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

    const maxDelegationAmount = availableBalance.minus(requiredFee)

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
      ? `You have currently <span class="style__strong color__primary">${delegatedFormatted}</span> delegated to this validator.`
      : 'Select the amount you want to delegate.'
    const extraDescription = canDelegate
      ? ` You can ${
          hasDelegated ? 'additionally' : ''
        } delegate up to <span class="style__strong color__primary">${maxDelegationFormatted}</span> (after transaction fees).`
      : ''

    return this.createMainDelegatorAction(
      protocol,
      delegatorDetails.availableActions,
      validator,
      [CosmosDelegationActionType.DELEGATE],
      'Delegate',
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
    const description = `You have currently delegated to this validator, you can undelegate up to <span class="style__strong color__primary">${delegatedAmountFormatted}</span>.`

    return this.createMainDelegatorAction(
      protocol,
      delegatorDetails.availableActions,
      validator,
      [CosmosDelegationActionType.UNDELEGATE],
      'Undelegate',
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
    rewards: BigNumber
  ): Promise<AirGapDelegatorAction[]> {
    const mainActionTypes = [CosmosDelegationActionType.DELEGATE, CosmosDelegationActionType.UNDELEGATE]
    return Promise.all(
      availableActions
        .filter(action => !mainActionTypes.includes(action.type))
        .map(async action => {
          let partial = {}
          switch (action.type) {
            case CosmosDelegationActionType.WITHDRAW_REWARDS:
              partial = await this.createWithdrawRewardsAction(protocol, rewards)
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

  private async createWithdrawRewardsAction(protocol: CosmosProtocol, rewards: BigNumber): Promise<Partial<AirGapDelegatorAction>> {
    const rewardsFormatted = this.amountConverterPipe.transform(rewards, {
      protocolIdentifier: protocol.identifier,
      maxDigits: 10
    })

    return {
      label: 'Rewards',
      confirmLabel: 'Claim Rewards',
      description: `You can claim up to <span class="style__strong color__primary">${rewardsFormatted}</span> in rewards for this delegation.`
    }
  }

  private createDisplayDetails(protocol: CosmosProtocol, totalDelegatedAmount: BigNumber, rewards: BigNumber): UIWidget[] {
    const details = []

    details.push(
      new UIIconText({
        iconName: 'people-outline',
        text: this.amountConverterPipe.transform(totalDelegatedAmount, {
          protocolIdentifier: protocol.identifier,
          maxDigits: 10
        }),
        description: 'Currently Delegated'
      })
    )

    if (rewards.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: this.amountConverterPipe.transform(rewards, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'Unclaimed Rewards'
        })
      )
    }

    return details
  }
}
