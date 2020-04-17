import { SubstrateProtocol, SubstratePayee, AirGapMarketWallet } from 'airgap-coin-lib'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapMainDelegatorAction,
  AirGapExtraDelegatorAction,
  AirGapDelegationDetails
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import BigNumber from 'bignumber.js'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIWidget, WidgetState } from 'src/app/models/widgets/UIWidget'
import { UIInputWidget } from 'src/app/models/widgets/UIInputWidget'
import { SubstrateStakingActionType } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/staking/SubstrateStakingActionType'
import { UIInputText, UIInputTextConfig } from 'src/app/models/widgets/input/UIInputText'
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
  SubstrateStakingActionType.WITHDRAW_UNBONDED,
  SubstrateStakingActionType.COLLECT_REWARDS
]

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
    const extraNominatorDetails = await this.getExtraNominatorDetails(protocol, delegator, delegatees)
    const extraValidatorsDetails = await this.getExtraValidatorsDetails(protocol, delegatees, extraNominatorDetails)

    return [
      {
        delegator: extraNominatorDetails,
        delegatees: extraValidatorsDetails
      }
    ]
  }

  private async getExtraValidatorsDetails(
    protocol: SubstrateProtocol,
    validators: string[],
    extraNominatorDetials: AirGapDelegatorDetails
  ): Promise<AirGapDelegateeDetails[]> {
    return Promise.all(
      validators.map(async validator => {
        const validatorDetails = await protocol.accountController.getValidatorDetails(validator)

        const ownStash = new BigNumber(validatorDetails.ownStash ? validatorDetails.ownStash : 0)
        const totalStakingBalance = new BigNumber(validatorDetails.totalStakingBalance ? validatorDetails.totalStakingBalance : 0)

        const displayDetails = this.createDelegateeDisplayDetails(protocol, validatorDetails, extraNominatorDetials)

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
    extraNominatorDetails: AirGapDelegatorDetails
  ): UIWidget[] {
    const details = []

    const commission = validatorDetails.commission ? new BigNumber(validatorDetails.commission) : null
    const totalPreviousReward = validatorDetails.lastEraReward ? new BigNumber(validatorDetails.lastEraReward.amount) : null

    const calculateExpectedReward = (userStake: BigNumber) => {
      const totalStake = new BigNumber(validatorDetails.totalStakingBalance).plus(userStake)
      const userShare = userStake.dividedBy(totalStake)
      const expectedReward = new BigNumber(1)
        .minus(commission)
        .multipliedBy(totalPreviousReward)
        .multipliedBy(userShare)

      return expectedReward
    }

    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: commission ? this.decimalPipe.transform(commission.multipliedBy(100).toString()) + '%' : '-',
        description: 'Commission'
      })
    )

    const showExpectedRewardWidget =
      totalPreviousReward &&
      commission &&
      validatorDetails.status === 'Active' &&
      extraNominatorDetails.delegateAction.isAvailable &&
      extraNominatorDetails.delegateAction.form

    if (showExpectedRewardWidget) {
      const expectedRewardWidget = new UIIconText({
        iconName: 'logo-usd',
        text: '-',
        description: 'Expected reward'
      })

      extraNominatorDetails.delegateAction.form.valueChanges.subscribe(value => {
        expectedRewardWidget.doAfterReached(
          WidgetState.INIT,
          () => {
            if (value[ArgumentName.VALUE]) {
              const expectedReward = calculateExpectedReward(new BigNumber(value[ArgumentName.VALUE]))
              expectedRewardWidget.text = this.amountConverterPipe.transform(expectedReward, {
                protocolIdentifier: protocol.identifier,
                maxDigits: 10
              })
            }
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
    address: string,
    validators: string[]
  ): Promise<AirGapDelegatorDetails> {
    const nominatorDetails = await protocol.accountController.getNominatorDetails(address, validators)
    const availableActions = nominatorDetails.availableActions.filter(action => supportedActions.includes(action.type))

    const delegateAction: AirGapMainDelegatorAction = await this.createDelegateAction(
      protocol,
      nominatorDetails.stakingDetails,
      availableActions,
      nominatorDetails.address,
      validators
    )

    const undelegateAction: AirGapMainDelegatorAction = this.createUndelegateAction(nominatorDetails.stakingDetails, availableActions)
    const extraActions: AirGapExtraDelegatorAction[] = this.createDelegatorExtraActions(availableActions)
    const displayDetails: UIWidget[] = this.createDelegatorDisplayDetails(protocol, nominatorDetails)
    const displayRewards: UIRewardList | undefined = this.createDelegatorDisplayRewards(protocol, nominatorDetails)

    return {
      ...nominatorDetails,
      delegateAction,
      undelegateAction,
      extraActions,
      displayDetails,
      displayRewards: displayRewards
    }
  }

  private async createDelegateAction(
    protocol: SubstrateProtocol,
    stakingDetails: SubstrateStakingDetails,
    availableActions: DelegatorAction[],
    nominatorAddress: string,
    validators: string[]
  ): Promise<AirGapMainDelegatorAction> {
    // sorted by priority
    const types = [
      SubstrateStakingActionType.BOND_NOMINATE,
      SubstrateStakingActionType.CHANGE_NOMINATION,
      SubstrateStakingActionType.BOND_EXTRA
    ]
    const actions = availableActions
      .filter(action => types.includes(action.type))
      .sort((a1, a2) => types.indexOf(a1.type) - types.indexOf(a2.type))

    const action = actions[0]

    const results = await Promise.all([
      protocol.estimateMaxDelegationValueFromAddress(nominatorAddress),
      protocol.nodeClient.getExistentialDeposit()
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
          this.createValueWidget({
            id: ArgumentName.VALUE_CONTROL,
            defaultValue: maxValueFormatted,
            toggleFixedValueButton: 'Max',
            fixedValue: maxValueFormatted,
            onValueChanged: (value: string) => {
              form.patchValue({
                [ArgumentName.VALUE]: new BigNumber(value).shiftedBy(protocol.decimals).toFixed()
              })
            }
          })
        )
      }

      return {
        type: action.type,
        isAvailable: true,
        description: 'Delegate description',
        form,
        extraArgs: argWidgets
      }
    }

    return {
      description: !hasSufficientFunds ? 'Not enough balance' : undefined,
      isAvailable: false
    }
  }

  private createUndelegateAction(
    stakingDetails: SubstrateStakingDetails | null,
    availableActions: DelegatorAction[]
  ): AirGapMainDelegatorAction {
    const action = availableActions.find(action => action.type === SubstrateStakingActionType.CANCEL_NOMINATION)

    if (action) {
      if (stakingDetails) {
        const form = this.formBuilder.group({
          [ArgumentName.VALUE]: [stakingDetails.active]
        })

        return {
          type: action.type,
          isAvailable: true,
          description: 'Undelegate description',
          form
        }
      }
    }

    return { isAvailable: false }
  }

  private createDelegatorExtraActions(availableActions: DelegatorAction[]): AirGapExtraDelegatorAction[] {
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
          case SubstrateStakingActionType.COLLECT_REWARDS:
            label = 'Collect Rewards'
            confirmLabel = 'Collect'
            description = 'Collect rewards description'
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

  private createValueWidget(config: Partial<UIInputTextConfig> = {}): UIInputText {
    return new UIInputText({
      id: ArgumentName.VALUE,
      inputType: 'number',
      label: 'Amount',
      placeholder: '0.00',
      defaultValue: '0.00',
      errorLabel: 'Invalid value',
      createExtraLabel: (value: string, wallet?: AirGapMarketWallet) => {
        if (wallet) {
          const marketPrice = new BigNumber(value || 0).multipliedBy(wallet.currentMarketPrice)
          return `$${this.decimalPipe.transform(marketPrice.toString(), '1.2-2')}`
        } else {
          return ''
        }
      },
      ...config
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
        collected: reward.collected,
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

  private createNominationDetails(protocol: SubstrateProtocol, stakingDetails: SubstrateStakingDetails): UIWidget[] {
    const details = []

    const nextEraDate = new Date(stakingDetails.nextEra)
    const unclaimed = stakingDetails.rewards.filter(reward => !reward.collected)

    details.push(
      new UIIconText({
        iconName: 'sync-outline',
        text: `${moment(nextEraDate).fromNow()} (${moment(nextEraDate).format('LLL')})`,
        description: stakingDetails.status === 'nominating_inactive' ? 'Becomes active' : 'Next payout'
      })
    )

    if (unclaimed.length > 0) {
      const totalNotCollected = unclaimed.reduce((sum, next) => sum.plus(next.amount), new BigNumber(0))
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: this.amountConverterPipe.transform(totalNotCollected, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'To collect'
        })
      )
    }

    return details
  }
}
