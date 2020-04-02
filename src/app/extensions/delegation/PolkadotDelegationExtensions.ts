import { PolkadotProtocol, PolkadotRewardDestination, AirGapMarketWallet } from 'airgap-coin-lib'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapMainDelegatorAction,
  AirGapExtraDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { PolkadotAddress } from 'airgap-coin-lib/dist/protocols/polkadot/data/account/PolkadotAddress'
import BigNumber from 'bignumber.js'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { UIInputWidget } from 'src/app/models/widgets/UIInputWidget'
import { PolkadotStakingActionType } from 'airgap-coin-lib/dist/protocols/polkadot/data/staking/PolkadotStakingActionType'
import { UIInputText, UIInputTextConfig } from 'src/app/models/widgets/input/UIInputText'
import { DelegatorAction } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { UISelect, UISelectConfig } from 'src/app/models/widgets/input/UISelect'
import * as moment from 'moment'
import { ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'
import {
  PolkadotNominatorDetails,
  PolkadotStakingDetails
} from 'airgap-coin-lib/dist/protocols/polkadot/data/staking/PolkadotNominatorDetails'
import { AmountConverterPipe } from 'src/app/pipes/amount-converter/amount-converter.pipe'
import { DecimalPipe } from '@angular/common'
import { FormBuilder, Validators, FormGroup } from '@angular/forms'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'
import { PolkadotValidatorDetails } from 'airgap-coin-lib/dist/protocols/polkadot/data/staking/PolkadotValidatorDetails'

const supportedActions = [
  PolkadotStakingActionType.BOND_NOMINATE,
  PolkadotStakingActionType.BOND_EXTRA,
  PolkadotStakingActionType.CANCEL_NOMINATION,
  PolkadotStakingActionType.CHANGE_NOMINATION,
  PolkadotStakingActionType.WITHDRAW_UNBONDED,
  PolkadotStakingActionType.COLLECT_REWARDS
]

const widgetId = {
  commission: 'commission',
  expectedReward: 'expectedReward',
  targets: 'targets',
  value: 'value',
  valueControl: 'valueControl',
  payee: 'payee'
}

export class PolkadotDelegationExtensions extends ProtocolDelegationExtensions<PolkadotProtocol> {
  private static instance: PolkadotDelegationExtensions

  public static create(
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverter: AmountConverterPipe
  ): PolkadotDelegationExtensions {
    if (!PolkadotDelegationExtensions.instance) {
      PolkadotDelegationExtensions.instance = new PolkadotDelegationExtensions(formBuilder, decimalPipe, amountConverter)
    }

    return PolkadotDelegationExtensions.instance
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
  public async getExtraDelegateesDetails(protocol: PolkadotProtocol, addresses: string[]): Promise<Partial<AirGapDelegateeDetails>[]> {
    return Promise.all(
      addresses.map(async address => {
        const validatorDetails = await protocol.accountController.getValidatorDetails(PolkadotAddress.fromEncoded(address))

        const ownStash = new BigNumber(validatorDetails.ownStash ? validatorDetails.ownStash : 0)
        const totalStakingBalance = new BigNumber(validatorDetails.totalStakingBalance ? validatorDetails.totalStakingBalance : 0)

        const extraDetails = await this.createDelegateeExtraDetails(protocol, validatorDetails)

        return {
          status: validatorDetails.status || 'unknown',
          usageDetails: {
            usage: ownStash.dividedBy(totalStakingBalance),
            current: ownStash,
            total: totalStakingBalance
          },
          extraDetails
        }
      })
    )
  }

  private async createDelegateeExtraDetails(protocol: PolkadotProtocol, validatorDetails: PolkadotValidatorDetails): Promise<UIWidget[]> {
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
  public async getExtraDelegatorDetailsFromAddress(protocol: PolkadotProtocol, address: string): Promise<Partial<AirGapDelegatorDetails>> {
    const nominatorDetails = await protocol.accountController.getNominatorDetails(address)
    const availableActions = nominatorDetails.availableActions.filter(action => supportedActions.includes(action.type))

    const results = await Promise.all([
      this.createDelegateAction(protocol, address, availableActions),
      this.createUndelegateAction(protocol, nominatorDetails.stakingDetails, availableActions),
      this.createChangeDelegateeAction(availableActions),
      this.createDelegatorExtraActions(availableActions),
      this.createDelegatorExtraDetails(protocol, nominatorDetails)
    ])

    const delegateAction = results[0]
    const undelegateAction = results[1]
    const changeDelegateeAction = results[2]
    const extraActions = results[3]
    const extraDetails = results[4]

    return {
      delegateAction,
      undelegateAction,
      changeDelegateeAction,
      extraActions,
      extraDetails
    }
  }

  public async onDetailsChange(
    _: PolkadotProtocol,
    delegateesDetails: AirGapDelegateeDetails[],
    delegatorDetails: AirGapDelegatorDetails
  ): Promise<void> {
    if (!delegatorDetails.isDelegating && delegatorDetails.delegateAction.isAvailable && delegatorDetails.delegateAction.form) {
      this.showExpectedRewardWidget(delegateesDetails, delegatorDetails.delegateAction.form)
    }
  }

  private async createDelegateAction(
    protocol: PolkadotProtocol,
    address: string,
    availableActions: DelegatorAction[]
  ): Promise<AirGapMainDelegatorAction> {
    const action = availableActions.find(
      action => action.type === PolkadotStakingActionType.BOND_NOMINATE || action.type === PolkadotStakingActionType.BOND_EXTRA
    )

    let partial: Partial<AirGapMainDelegatorAction>
    if (action) {
      const results = await Promise.all([
        protocol.estimateMaxDelegationValueFromAddress(address),
        protocol.nodeClient.getExistentialDeposit()
      ])

      const maxValue = new BigNumber(results[0])
      const minValue = new BigNumber(results[1])

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
        [widgetId.payee]: []
      })

      if (maxValue.gt(0)) {
        partial = {
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
            }),
            ...(action.type === PolkadotStakingActionType.BOND_NOMINATE ? [this.createPayeeWidget({ isVisible: false })] : [])
          ]
        }
      } else {
        partial = { description: 'Insufficient funds' }
      }
    }

    return {
      description: "Can't delegate",
      isAvailable: false,
      ...partial
    }
  }

  private async createUndelegateAction(
    protocol: PolkadotProtocol,
    stakingDetails: PolkadotStakingDetails | null,
    availableActions: DelegatorAction[]
  ): Promise<AirGapMainDelegatorAction> {
    const action = availableActions.find(action => action.type === PolkadotStakingActionType.CANCEL_NOMINATION)

    if (action) {
      if (stakingDetails) {
        const valueFormatted = this.amountConverterPipe.formatBigNumber(
          new BigNumber(stakingDetails.active).shiftedBy(-protocol.decimals),
          10
        )

        const form = this.formBuilder.group({
          [widgetId.value]: [],
          [widgetId.valueControl]: [
            valueFormatted,
            Validators.compose([
              Validators.required,
              Validators.max(new BigNumber(valueFormatted).toNumber()),
              DecimalValidator.validate(protocol.decimals)
            ])
          ]
        })

        return {
          type: action.type,
          isAvailable: true,
          description: 'Undelegate description',
          form,
          extraArgs: [
            this.createValueWidget({
              id: widgetId.valueControl,
              isVisible: false,
              toggleFixedValueButton: 'Max',
              fixedValue: valueFormatted,
              defaultValue: valueFormatted,
              onValueChanged: (value: string) => {
                form.patchValue({
                  [widgetId.value]: new BigNumber(value).shiftedBy(protocol.decimals).toFixed()
                })
              }
            })
          ]
        }
      }
    }

    return {
      description: "Can't undelegate",
      isAvailable: false
    }
  }

  private async createChangeDelegateeAction(availableActions: DelegatorAction[]): Promise<AirGapMainDelegatorAction> {
    const description = 'Change Validator'
    const action = availableActions.find(action => action.type === PolkadotStakingActionType.CHANGE_NOMINATION)

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
          action.type !== PolkadotStakingActionType.BOND_NOMINATE &&
          action.type !== PolkadotStakingActionType.BOND_EXTRA &&
          action.type !== PolkadotStakingActionType.CANCEL_NOMINATION &&
          action.type !== PolkadotStakingActionType.CHANGE_NOMINATION
      )
      .map(action => {
        let label: string
        let confirmLabel: string
        let description: string
        let args: UIInputWidget<any>[]

        switch (action.type) {
          case PolkadotStakingActionType.WITHDRAW_UNBONDED:
            label = 'Withdraw Unbonded'
            confirmLabel = 'Withdraw'
            description = 'Withdraw unbonded description'
            break
          case PolkadotStakingActionType.COLLECT_REWARDS:
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

  private createPayeeWidget(config: Partial<UISelectConfig> = {}): UISelect {
    return new UISelect({
      id: widgetId.payee,
      label: 'Reward destination',
      options: [
        [PolkadotRewardDestination.STAKED, 'Staked'], // probably needs better labels
        [PolkadotRewardDestination.STASH, 'Stash'],
        [PolkadotRewardDestination.CONTROLLER, 'Controller']
      ],
      defaultOption: PolkadotRewardDestination.STASH,
      ...config
    })
  }

  private async createDelegatorExtraDetails(protocol: PolkadotProtocol, nominatorDetails: PolkadotNominatorDetails): Promise<UIWidget[]> {
    const extraDetails = []

    if (nominatorDetails.stakingDetails) {
      extraDetails.push(...(await this.createStakingDetailsWidgets(protocol, nominatorDetails.stakingDetails)))
    }

    return extraDetails
  }

  private async createStakingDetailsWidgets(protocol: PolkadotProtocol, stakingDetails: PolkadotStakingDetails): Promise<UIWidget[]> {
    const details = []

    details.push(...(await this.createBondedDetails(protocol, stakingDetails)))

    if (stakingDetails.status === 'nominating') {
      details.push(...(await this.createNominationDetails(protocol, stakingDetails)))
    }

    return details
  }

  private async createBondedDetails(protocol: PolkadotProtocol, stakingDetails: PolkadotStakingDetails): Promise<UIWidget[]> {
    const details = []

    const totalStaking = new BigNumber(stakingDetails.total)
    const activeStaking = new BigNumber(stakingDetails.active)
    const totalUnlocked = new BigNumber(stakingDetails.unlocked)

    if (totalStaking.eq(activeStaking)) {
      details.push(
        new UIIconText({
          iconName: 'contacts',
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
          iconName: 'contacts',
          text: this.amountConverterPipe.transform(nextUnlockingValue, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: 'Locked'
        }),
        new UIIconText({
          iconName: 'alarm',
          text: `${moment(unlockingDate).fromNow()} (${moment(unlockingDate).format('LLL')})`,
          description: 'Ready to withdraw'
        })
      )
    } else if (totalUnlocked.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'contacts',
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

  private async createNominationDetails(protocol: PolkadotProtocol, stakingDetails: PolkadotStakingDetails): Promise<UIWidget[]> {
    const details = []

    const nextEraDate = new Date(stakingDetails.nextEra)
    const [collected, notCollected] = this.partitionArray(stakingDetails.previousRewards, reward => reward.collected)

    details.push(
      new UIIconText({
        iconName: 'sync',
        text: `${moment(nextEraDate).fromNow()} (${moment(nextEraDate).format('LLL')})`,
        description: stakingDetails.status === 'nominating_inactive' ? 'Becomes active' : 'Next payout'
      })
    )

    if (notCollected.length > 0) {
      const totalNotCollected = notCollected.reduce((sum, next) => sum.plus(next.amount), new BigNumber(0))
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
    } else if (collected.length > 0) {
      const lastCollected = collected[0]
      const lastCollectedAmount = new BigNumber(lastCollected.amount)
      const lastCollectedDate = new Date(lastCollected.timestamp)
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: this.amountConverterPipe.transform(lastCollectedAmount, {
            protocolIdentifier: protocol.identifier,
            maxDigits: 10
          }),
          description: `Last reward: ${moment(lastCollectedDate).format('LLL')}`
        })
      )
    }

    return details
  }

  private showExpectedRewardWidget(delegateesDetails: AirGapDelegateeDetails[], delegationActionForm: FormGroup) {
    delegateesDetails.forEach(details => {
      if (details.extraDetails) {
        const expectedRewardWidget = details.extraDetails.find(extra => extra.id === widgetId.expectedReward)
        if (expectedRewardWidget) {
          expectedRewardWidget.setConnectedForms(delegationActionForm)
          expectedRewardWidget.isVisible = true
        }
      }
    })
  }

  private partitionArray<T>(array: T[], predicate: (value: T) => boolean): [T[], T[]] {
    const partitioned: [T[], T[]] = [[], []]
    for (let item of array) {
      const index = predicate(item) ? 0 : 1
      partitioned[index].push(item)
    }

    return partitioned
  }
}
