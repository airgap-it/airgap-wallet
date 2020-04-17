import { SubstrateProtocol, SubstratePayee, AirGapMarketWallet } from 'airgap-coin-lib'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapMainDelegatorAction,
  AirGapExtraDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { SubstrateAddress } from 'airgap-coin-lib/dist/protocols/substrate/helpers/data/account/SubstrateAddress'
import BigNumber from 'bignumber.js'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
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
import { FormBuilder, Validators, FormGroup } from '@angular/forms'
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

const widgetId = {
  commission: 'commission',
  expectedReward: 'expectedReward',
  targets: 'targets',
  value: 'value',
  valueControl: 'valueControl',
  payee: 'payee'
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
  public async getExtraDelegateesDetails(protocol: SubstrateProtocol, addresses: string[]): Promise<Partial<AirGapDelegateeDetails>[]> {
    return Promise.all(
      addresses.map(async address => {
        const validatorDetails = await protocol.accountController.getValidatorDetails(SubstrateAddress.fromEncoded(address))

        const ownStash = new BigNumber(validatorDetails.ownStash ? validatorDetails.ownStash : 0)
        const totalStakingBalance = new BigNumber(validatorDetails.totalStakingBalance ? validatorDetails.totalStakingBalance : 0)

        const displayDetails = this.createDelegateeDisplayDetails(protocol, validatorDetails)

        return {
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

  private createDelegateeDisplayDetails(protocol: SubstrateProtocol, validatorDetails: SubstrateValidatorDetails): UIWidget[] {
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
        id: widgetId.commission,
        iconName: 'logo-usd',
        text: commission ? this.decimalPipe.transform(commission.multipliedBy(100).toString()) + '%' : '-',
        description: 'Commission'
      })
    )

    if (totalPreviousReward && commission && validatorDetails.status === 'Active') {
      details.push(
        new UIIconText({
          id: widgetId.expectedReward,
          iconName: 'logo-usd',
          text: '-',
          description: 'Expected reward',
          isVisible: false,
          onConnectedFormChanged: (value: any, widget: UIIconText) => {
            if (value[widgetId.value]) {
              const expectedReward = calculateExpectedReward(new BigNumber(value[widgetId.value]))
              widget.text = this.amountConverterPipe.transform(expectedReward, {
                protocolIdentifier: protocol.identifier,
                maxDigits: 10
              })
            }
          }
        })
      )
    }
    return details
  }

  // TODO: add translations
  public async getExtraDelegatorDetailsFromAddress(protocol: SubstrateProtocol, address: string): Promise<Partial<AirGapDelegatorDetails>> {
    const nominatorDetails = await protocol.accountController.getNominatorDetails(address)
    const availableActions = nominatorDetails.availableActions.filter(action => supportedActions.includes(action.type))

    const delegateAction: AirGapMainDelegatorAction = await this.createDelegateAction(protocol, address, availableActions)
    const undelegateAction: AirGapMainDelegatorAction = this.createUndelegateAction(nominatorDetails.stakingDetails, availableActions)
    const changeDelegateeAction: AirGapMainDelegatorAction = this.createChangeDelegateeAction(availableActions)
    const extraActions: AirGapExtraDelegatorAction[] = this.createDelegatorExtraActions(availableActions)
    const displayDetails: UIWidget[] = this.createDelegatorDisplayDetails(protocol, nominatorDetails)
    const displayRewards: UIRewardList | undefined = this.createDelegatorDisplayRewards(protocol, nominatorDetails)

    return {
      delegateAction,
      undelegateAction,
      changeDelegateeAction,
      extraActions,
      displayDetails,
      displayRewards: displayRewards
    }
  }

  public async onDetailsChange(
    _: SubstrateProtocol,
    delegateesDetails: AirGapDelegateeDetails[],
    delegatorDetails: AirGapDelegatorDetails
  ): Promise<void> {
    if (!delegatorDetails.isDelegating && delegatorDetails.delegateAction.isAvailable && delegatorDetails.delegateAction.form) {
      this.showExpectedRewardWidget(delegateesDetails, delegatorDetails.delegateAction.form)
    }
  }

  private async createDelegateAction(
    protocol: SubstrateProtocol,
    address: string,
    availableActions: DelegatorAction[]
  ): Promise<AirGapMainDelegatorAction> {
    const action = availableActions.find(
      action => action.type === SubstrateStakingActionType.BOND_NOMINATE || action.type === SubstrateStakingActionType.BOND_EXTRA
    )

    const results = await Promise.all([
      protocol.estimateMaxDelegationValueFromAddress(address),
      protocol.nodeClient.getExistentialDeposit()
    ])

    const maxValue = new BigNumber(results[0])
    const minValue = new BigNumber(results[1])

    if (action && maxValue.gt(minValue)) {
      const maxValueFormatted = this.amountConverterPipe.formatBigNumber(maxValue.shiftedBy(-protocol.decimals), 10)

      const form = this.formBuilder.group({
        [widgetId.value]: [],
        [widgetId.valueControl]: [
          maxValueFormatted,
          Validators.compose([
            Validators.required,
            Validators.min(minValue.shiftedBy(-protocol.decimals).toNumber()),
            Validators.max(new BigNumber(maxValueFormatted).toNumber()),
            DecimalValidator.validate(protocol.decimals)
          ])
        ],
        [widgetId.payee]: [SubstratePayee.STASH]
      })

      return {
        type: action.type,
        isAvailable: true,
        description: 'Delegate description',
        paramName: widgetId.targets,
        form,
        extraArgs: [
          this.createValueWidget({
            id: widgetId.valueControl,
            defaultValue: maxValueFormatted,
            toggleFixedValueButton: 'Max',
            fixedValue: maxValueFormatted,
            onValueChanged: (value: string) => {
              form.patchValue({
                [widgetId.value]: new BigNumber(value).shiftedBy(protocol.decimals).toFixed()
              })
            }
          })
        ]
      }
    }

    return {
      description: "Can't delegate",
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
          [widgetId.value]: [stakingDetails.active]
        })

        return {
          type: action.type,
          isAvailable: true,
          description: 'Undelegate description',
          form
        }
      }
    }

    return {
      description: "Can't undelegate",
      isAvailable: false
    }
  }

  private createChangeDelegateeAction(availableActions: DelegatorAction[]): AirGapMainDelegatorAction {
    const description = 'Change Validator'
    const action = availableActions.find(action => action.type === SubstrateStakingActionType.CHANGE_NOMINATION)

    if (action) {
      return {
        type: action.type,
        isAvailable: true,
        description,
        paramName: widgetId.targets
      }
    }

    return {
      description,
      isAvailable: true
    }
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
      id: widgetId.value,
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

    if (nominatorDetails.stakingDetails) {
      displayDetails.push(...this.createStakingDetailsWidgets(protocol, nominatorDetails.isDelegating, nominatorDetails.stakingDetails))
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
    if (!nominatorDetails.isDelegating || nominatorDetails.stakingDetails.rewards.length === 0) {
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

  private showExpectedRewardWidget(delegateesDetails: AirGapDelegateeDetails[], delegationActionForm: FormGroup) {
    delegateesDetails.forEach(details => {
      if (details.displayDetails) {
        const expectedRewardWidget = details.displayDetails.find(extra => extra.id === widgetId.expectedReward)
        if (expectedRewardWidget) {
          expectedRewardWidget.setConnectedForms(delegationActionForm)
          expectedRewardWidget.isVisible = true
        }
      }
    })
  }
}
