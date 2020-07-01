import { SubstrateProtocol, SubstratePayee } from 'airgap-coin-lib'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import BigNumber from 'bignumber.js'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIWidget, WidgetState } from 'src/app/models/widgets/UIWidget'
import { UIInputWidget } from 'src/app/models/widgets/UIInputWidget'
import { SubstrateStakingActionType } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/staking/SubstrateStakingActionType'
import { DelegatorAction } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import * as moment from 'moment'
import { ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'
import {
  SubstrateNominatorDetails,
  SubstrateStakingDetails
} from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/staking/SubstrateNominatorDetails'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { DecimalPipe } from '@angular/common'
import { FormBuilder, Validators } from '@angular/forms'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'
import { SubstrateValidatorDetails } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/staking/SubstrateValidatorDetails'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'

const supportedActions = [
  SubstrateStakingActionType.BOND_NOMINATE,
  SubstrateStakingActionType.BOND_EXTRA,
  SubstrateStakingActionType.CANCEL_NOMINATION,
  SubstrateStakingActionType.CHANGE_NOMINATION,
  SubstrateStakingActionType.WITHDRAW_UNBONDED
]

// sorted by priority
const delegateActions = [
  SubstrateStakingActionType.BOND_NOMINATE,
  SubstrateStakingActionType.CHANGE_NOMINATION,
  SubstrateStakingActionType.BOND_EXTRA
]

// sorted by priority
const undelegateActions = [SubstrateStakingActionType.CANCEL_NOMINATION]

enum ArgumentName {
  TARGETS = 'targets',
  VALUE = 'value',
  VALUE_CONTROL = 'valueControl',
  PAYEE = 'payee'
}

export class SubstrateDelegationExtensions extends ProtocolDelegationExtensions<SubstrateProtocol> {
  private static instance: SubstrateDelegationExtensions

  public static create(
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverterPipe: AmountConverterPipe
  ): SubstrateDelegationExtensions {
    if (!SubstrateDelegationExtensions.instance) {
      SubstrateDelegationExtensions.instance = new SubstrateDelegationExtensions(formBuilder, decimalPipe, amountConverterPipe)
    }

    return SubstrateDelegationExtensions.instance
  }

  public airGapDelegatee?: string = undefined
  public delegateeLabel: string = 'Validator'

  private constructor(
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe
  ) {
    super()
  }

  // TODO: add translations
  public async getExtraDelegationDetailsFromAddress(
    protocol: SubstrateProtocol,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const nominatorDetails = await protocol.options.config.accountController.getNominatorDetails(delegator, delegatees)

    const extraNominatorDetails = await this.getExtraNominatorDetails(protocol, nominatorDetails, delegatees)
    const extraValidatorsDetails = await this.getExtraValidatorsDetails(protocol, delegatees, nominatorDetails, extraNominatorDetails)

    return [
      {
        delegator: extraNominatorDetails,
        delegatees: extraValidatorsDetails
      }
    ]
  }

  public async getRewardDisplayDetails(
    protocol: SubstrateProtocol,
    delegator: string,
    delegatees: string[]
  ): Promise<UIRewardList | undefined> {
    const nominatorDetails = await protocol.options.config.accountController.getNominatorDetails(delegator, delegatees)

    return this.createDelegatorDisplayRewards(protocol, nominatorDetails)
  }

  private async getExtraValidatorsDetails(
    protocol: SubstrateProtocol,
    validators: string[],
    nominatorDetails: SubstrateNominatorDetails,
    extraNominatorDetials: AirGapDelegatorDetails
  ): Promise<AirGapDelegateeDetails[]> {
    return Promise.all(
      validators.map(async validator => {
        const validatorDetails = await protocol.options.config.accountController.getValidatorDetails(validator)

        const ownStash = new BigNumber(validatorDetails.ownStash ? validatorDetails.ownStash : 0)
        const totalStakingBalance = new BigNumber(validatorDetails.totalStakingBalance ? validatorDetails.totalStakingBalance : 0)

        const displayDetails = this.createDelegateeDisplayDetails(protocol, validatorDetails, nominatorDetails, extraNominatorDetials)

        return {
          ...validatorDetails,
          name: validatorDetails.name || '',
          status: validatorDetails.status || 'unknown',
          usageDetails: {
            usage: ownStash.dividedBy(totalStakingBalance),
            current: ownStash,
            total: totalStakingBalance
          },
          displayDetails
        }
      })
    )
  }

  private createDelegateeDisplayDetails(
    protocol: SubstrateProtocol,
    validatorDetails: SubstrateValidatorDetails,
    nominatorDetails: SubstrateNominatorDetails,
    extraNominatorDetails: AirGapDelegatorDetails
  ): UIWidget[] {
    const details = []

    const commission = validatorDetails.commission ? new BigNumber(validatorDetails.commission) : null
    const totalPreviousReward = validatorDetails.lastEraReward ? new BigNumber(validatorDetails.lastEraReward.amount) : null

    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: commission ? this.decimalPipe.transform(commission.multipliedBy(100).toString()) + '%' : '-',
        description: 'Commission'
      })
    )

    const delegateAction = extraNominatorDetails.mainActions
      ? extraNominatorDetails.mainActions.find(action => delegateActions.includes(action.type))
      : undefined

    const showExpectedRewardWidget =
      !!totalPreviousReward && !!commission && validatorDetails.status === 'Active' && !!delegateAction && !!delegateAction.form

    if (showExpectedRewardWidget) {
      const bonded = nominatorDetails.stakingDetails ? new BigNumber(nominatorDetails.stakingDetails.total) : new BigNumber(0)

      const getExpectedReward = (userStake: BigNumber) => {
        const totalStake = new BigNumber(validatorDetails.totalStakingBalance).plus(userStake)
        const userShare = userStake.dividedBy(totalStake)
        const expectedReward = new BigNumber(1)
          .minus(commission)
          .multipliedBy(totalPreviousReward)
          .multipliedBy(userShare)

        return this.amountConverterPipe.transform(expectedReward, {
          protocolIdentifier: protocol.identifier,
          maxDigits: 10
        })
      }

      const expectedRewardWidget = new UIIconText({
        iconName: 'logo-usd',
        text: getExpectedReward(bonded),
        description: 'Expected reward'
      })

      delegateAction.form.valueChanges.subscribe(value => {
        expectedRewardWidget.doAfterReached(
          WidgetState.INIT,
          () => {
            const userStake = bonded.plus(value[ArgumentName.VALUE] || 0)
            expectedRewardWidget.text = getExpectedReward(userStake)
          },
          true
        )
      })

      details.push(expectedRewardWidget)
    }
    return details
  }

  private async getExtraNominatorDetails(
    protocol: SubstrateProtocol,
    nominatorDetails: SubstrateNominatorDetails,
    validators: string[]
  ): Promise<AirGapDelegatorDetails> {
    const availableActions = nominatorDetails.availableActions.filter(action => supportedActions.includes(action.type))

    const delegateAction: AirGapDelegatorAction = await this.createDelegateAction(
      protocol,
      nominatorDetails.stakingDetails,
      availableActions,
      nominatorDetails.address,
      validators
    )

    const undelegateAction: AirGapDelegatorAction = this.createUndelegateAction(nominatorDetails.stakingDetails, availableActions)
    const extraActions: AirGapDelegatorAction[] = this.createDelegatorExtraActions(availableActions)
    const displayDetails: UIWidget[] = this.createDelegatorDisplayDetails(protocol, nominatorDetails)

    return {
      ...nominatorDetails,
      mainActions: [delegateAction, ...extraActions].filter(action => !!action),
      secondaryActions: [undelegateAction].filter(action => !!action),
      displayDetails
    }
  }

  private async createDelegateAction(
    protocol: SubstrateProtocol,
    stakingDetails: SubstrateStakingDetails,
    availableActions: DelegatorAction[],
    nominatorAddress: string,
    validators: string[]
  ): Promise<AirGapDelegatorAction | null> {
    const actions = availableActions
      .filter(action => delegateActions.includes(action.type))
      .sort((a1, a2) => delegateActions.indexOf(a1.type) - delegateActions.indexOf(a2.type))

    const action = actions[0]

    const results = await Promise.all([
      protocol.estimateMaxDelegationValueFromAddress(nominatorAddress),
      protocol.options.config.nodeClient.getExistentialDeposit()
    ])

    const maxValue = new BigNumber(results[0])
    const minValue = new BigNumber(results[1])

    const hasSufficientFunds = maxValue.gt(minValue)

    if (action && hasSufficientFunds) {
      const maxValueFormatted = this.amountConverterPipe.formatBigNumber(maxValue.shiftedBy(-protocol.decimals), 10)

      const form = this.formBuilder.group({
        [ArgumentName.TARGETS]: [validators],
        [ArgumentName.VALUE]: [action.args.includes(ArgumentName.VALUE) ? maxValue.toString() : stakingDetails.active],
        [ArgumentName.VALUE_CONTROL]: [
          maxValueFormatted,
          Validators.compose([
            Validators.required,
            Validators.min(minValue.shiftedBy(-protocol.decimals).toNumber()),
            Validators.max(new BigNumber(maxValueFormatted).toNumber()),
            DecimalValidator.validate(protocol.decimals)
          ])
        ],
        [ArgumentName.PAYEE]: [SubstratePayee.STASH]
      })

      const argWidgets = []
      if (action.args.includes(ArgumentName.VALUE)) {
        argWidgets.push(
          this.createAmountWidget(ArgumentName.VALUE_CONTROL, maxValueFormatted, {
            onValueChanged: (value: string) => {
              form.patchValue({ [ArgumentName.VALUE]: new BigNumber(value).shiftedBy(protocol.decimals).toFixed() })
            }
          })
        )
      }

      const description = this.createDelegateActionDescription(protocol, action.type, stakingDetails ? stakingDetails.active : 0, maxValue)

      return {
        type: action.type,
        label: 'Delegate',
        description,
        form,
        args: argWidgets
      }
    }

    return null
  }

  private createDelegateActionDescription(
    protocol: SubstrateProtocol,
    actionType: SubstrateStakingActionType,
    bonded: string | number | BigNumber,
    maxValue: string | number | BigNumber
  ): string | undefined {
    const bondedFormatted = this.amountConverterPipe.transform(bonded, {
      protocolIdentifier: protocol.identifier,
      maxDigits: 10
    })
    const maxValueFormatted = this.amountConverterPipe.transform(maxValue, {
      protocolIdentifier: protocol.identifier,
      maxDigits: 10
    })

    let description: string | undefined
    switch (actionType) {
      case SubstrateStakingActionType.BOND_NOMINATE:
        description = `Select the amount you want to delegate. You can delegate up to <span class="style__strong color__primary">${maxValueFormatted}</span> (after transaction fees).`
        break
      case SubstrateStakingActionType.BOND_EXTRA:
        description = `You have currently <span class="style__strong color__primary">${bondedFormatted}</span> delegated. You can additionally delegate up to <span class="style__strong color__primary">${maxValueFormatted}</span> (after transaction fees).`
        break
      case SubstrateStakingActionType.CHANGE_NOMINATION:
        description = `Change your delegation. You have currently <span class="style__strong color__primary">${bondedFormatted}</span> delegated.`
        break
      default:
        description = undefined
    }

    return description
  }

  private createUndelegateAction(
    stakingDetails: SubstrateStakingDetails | null,
    availableActions: DelegatorAction[]
  ): AirGapDelegatorAction | null {
    const actions = availableActions
      .filter(action => undelegateActions.includes(action.type))
      .sort((a1, a2) => delegateActions.indexOf(a1.type) - delegateActions.indexOf(a2.type))

    const action = actions[0]

    if (action) {
      if (stakingDetails) {
        const form = this.formBuilder.group({
          [ArgumentName.VALUE]: [stakingDetails.active]
        })

        return {
          type: action.type,
          label: 'Undelegate',
          iconName: 'close-outline',
          form
        }
      }
    }

    return null
  }

  private createDelegatorExtraActions(availableActions: DelegatorAction[]): AirGapDelegatorAction[] {
    return availableActions
      .filter(
        action =>
          action.type !== SubstrateStakingActionType.BOND_NOMINATE &&
          action.type !== SubstrateStakingActionType.BOND_EXTRA &&
          action.type !== SubstrateStakingActionType.CANCEL_NOMINATION &&
          action.type !== SubstrateStakingActionType.CHANGE_NOMINATION
      )
      .map(action => {
        let label: string
        let confirmLabel: string
        let description: string
        let args: UIInputWidget<any>[]

        switch (action.type) {
          case SubstrateStakingActionType.WITHDRAW_UNBONDED:
            label = 'Withdraw Unbonded'
            confirmLabel = 'Withdraw'
            description = 'Withdraw unbonded description'
            break
        }

        return {
          type: action.type,
          label,
          description,
          confirmLabel,
          args
        }
      })
  }

  private createDelegatorDisplayDetails(protocol: SubstrateProtocol, nominatorDetails: SubstrateNominatorDetails): UIWidget[] {
    const displayDetails = []
    const isDelegating = nominatorDetails.delegatees.length > 0

    if (nominatorDetails.stakingDetails) {
      displayDetails.push(...this.createStakingDetailsWidgets(protocol, isDelegating, nominatorDetails.stakingDetails))
    }

    return displayDetails
  }

  private createStakingDetailsWidgets(
    protocol: SubstrateProtocol,
    isNominating: boolean,
    stakingDetails: SubstrateStakingDetails
  ): UIWidget[] {
    const details = []

    details.push(...this.createBondedDetails(protocol, stakingDetails))

    if (isNominating) {
      details.push(...this.createNominationDetails(protocol, stakingDetails))
    }

    return details
  }

  private createDelegatorDisplayRewards(
    protocol: SubstrateProtocol,
    nominatorDetails: SubstrateNominatorDetails
  ): UIRewardList | undefined {
    if (nominatorDetails.delegatees.length === 0 || nominatorDetails.stakingDetails.rewards.length === 0) {
      return undefined
    }

    return new UIRewardList({
      rewards: nominatorDetails.stakingDetails.rewards.slice(0, 5).map(reward => ({
        index: reward.eraIndex,
        amount: this.amountConverterPipe.transform(reward.amount, {
          protocolIdentifier: protocol.identifier,
          maxDigits: 10
        }),
        timestamp: reward.timestamp
      })),
      indexColLabel: 'Era',
      amountColLabel: 'Reward',
      payoutColLabel: 'Payout'
    })
  }

  private createBondedDetails(protocol: SubstrateProtocol, stakingDetails: SubstrateStakingDetails): UIWidget[] {
    const details = []

    const totalStaking = new BigNumber(stakingDetails.total)
    const activeStaking = new BigNumber(stakingDetails.active)
    const totalUnlocked = new BigNumber(stakingDetails.unlocked)

    if (totalStaking.eq(activeStaking)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: this.amountConverterPipe.transform(totalStaking, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: stakingDetails.status === 'nominating' ? 'Delegated' : 'Bonded'
        })
      )
    } else if (stakingDetails.locked.length > 0) {
      const nextUnlocking = stakingDetails.locked.sort((a, b) => a.expectedUnlock - b.expectedUnlock)[0]
      const unlockingDate = new Date(nextUnlocking.expectedUnlock)

      const nextUnlockingValue = new BigNumber(nextUnlocking.value)

      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: this.amountConverterPipe.transform(nextUnlockingValue, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'Locked'
        }),
        new UIIconText({
          iconName: 'alarm-outline',
          text: `${moment(unlockingDate).fromNow()} (${moment(unlockingDate).format('LLL')})`,
          description: 'Ready to withdraw'
        })
      )
    } else if (totalUnlocked.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: this.amountConverterPipe.transform(totalUnlocked, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'Ready to withdraw'
        })
      )
    }
    return details
  }

  private createNominationDetails(_protocol: SubstrateProtocol, stakingDetails: SubstrateStakingDetails): UIWidget[] {
    const details = []

    const nextEraDate = new Date(stakingDetails.nextEra)

    details.push(
      new UIIconText({
        iconName: 'sync-outline',
        text: `${moment(nextEraDate).fromNow()} (${moment(nextEraDate).format('LLL')})`,
        description: stakingDetails.status === 'nominating_inactive' ? 'Becomes active' : 'Next payout'
      })
    )

    return details
  }
}
