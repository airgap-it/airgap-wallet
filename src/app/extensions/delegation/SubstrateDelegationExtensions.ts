import { AmountConverterPipe } from '@airgap/angular-core'
import { MainProtocolSymbols } from '@airgap/coinlib-core'
import { DelegatorAction } from '@airgap/coinlib-core/protocols/ICoinDelegateProtocol'
import {
  SubstrateDelegateProtocol,
  SubstrateElectionStatus,
  SubstrateNetwork,
  SubstrateNominationStatus,
  SubstrateNominatorDetails,
  SubstratePayee,
  SubstrateStakingActionType,
  SubstrateStakingDetails,
  SubstrateValidatorDetails
} from '@airgap/substrate'
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
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { UIAlert } from 'src/app/models/widgets/display/UIAlert'
import { UIIconText } from 'src/app/models/widgets/display/UIIconText'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { UIInputWidget } from 'src/app/models/widgets/UIInputWidget'
import { UIWidget, WidgetState } from 'src/app/models/widgets/UIWidget'
import { ShortenStringPipe } from 'src/app/pipes/shorten-string/shorten-string.pipe'
import { DecimalValidator } from 'src/app/validators/DecimalValidator'

import { V0ProtocolDelegationExtensions } from './base/V0ProtocolDelegationExtensions'

// sorted by priority
const delegateActions = [
  SubstrateStakingActionType.BOND_NOMINATE,
  SubstrateStakingActionType.REBOND_NOMINATE,
  SubstrateStakingActionType.NOMINATE,
  SubstrateStakingActionType.CHANGE_NOMINATION,
  SubstrateStakingActionType.BOND_EXTRA,
  SubstrateStakingActionType.REBOND_EXTRA
]

// sorted by priority
const undelegateActions = [SubstrateStakingActionType.CANCEL_NOMINATION, SubstrateStakingActionType.UNBOND]

const supportedActions = [...delegateActions, ...undelegateActions, SubstrateStakingActionType.WITHDRAW_UNBONDED]

enum ArgumentName {
  TARGETS = 'targets',
  VALUE = 'value',
  VALUE_CONTROL = 'valueControl',
  PAYEE = 'payee'
}

export class SubstrateDelegationExtensions extends V0ProtocolDelegationExtensions<SubstrateDelegateProtocol<SubstrateNetwork>> {
  private static instance: SubstrateDelegationExtensions

  public static create(
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverterPipe: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe,
    translateService: TranslateService
  ): SubstrateDelegationExtensions {
    if (!SubstrateDelegationExtensions.instance) {
      SubstrateDelegationExtensions.instance = new SubstrateDelegationExtensions(
        formBuilder,
        decimalPipe,
        amountConverterPipe,
        shortenStringPipe,
        translateService
      )
    }

    return SubstrateDelegationExtensions.instance
  }

  public airGapDelegatee(_protocol: SubstrateDelegateProtocol<SubstrateNetwork>): string | undefined {
    return undefined
  }

  public delegateeLabel: string = 'delegation-detail-substrate.delegatee-label'
  public delegateeLabelPlural: string = 'delegation-detail-substrate.delegatee-label-plural'
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

  public async getExtraDelegationDetailsFromAddress(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    _publicKey: string,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const [nominatorDetails, validatorsDetails]: [SubstrateNominatorDetails, SubstrateValidatorDetails[]] = await Promise.all([
      protocol.options.accountController.getNominatorDetails(delegator, delegatees),
      Promise.all(delegatees.map((validator: string) => protocol.options.accountController.getValidatorDetails(validator)))
    ])

    const extraNominatorDetails: AirGapDelegatorDetails = await this.getExtraNominatorDetails(protocol, nominatorDetails, delegatees)
    const extraValidatorsDetails: AirGapDelegateeDetails[] = await this.getExtraValidatorsDetails(
      protocol,
      validatorsDetails,
      nominatorDetails,
      extraNominatorDetails
    )

    const alerts: UIAlert[] = (
      await Promise.all(
        validatorsDetails.map((validatorDetails: SubstrateValidatorDetails) => this.getAlerts(protocol, nominatorDetails, validatorDetails))
      )
    ).reduce((flatten: UIAlert[], next: UIAlert[]) => flatten.concat(next), [])

    return [
      {
        alerts: alerts.length > 0 ? alerts : undefined,
        delegator: extraNominatorDetails,
        delegatees: extraValidatorsDetails
      }
    ]
  }

  public async getRewardDisplayDetails(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    delegator: string,
    delegatees: string[]
  ): Promise<UIRewardList | undefined> {
    const nominatorDetails = await protocol.options.accountController.getNominatorDetails(delegator, delegatees)

    return this.createDelegatorDisplayRewards(protocol, nominatorDetails)
  }

  public async createDelegateesSummary(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    delegatees: string[]
  ): Promise<UIAccountSummary[]> {
    const delegateesDetails: SubstrateValidatorDetails[] = await Promise.all(
      delegatees.map((delegatee) => protocol.options.accountController.getValidatorDetails(delegatee))
    )

    return delegateesDetails.map(
      (details: SubstrateValidatorDetails) =>
        new UIAccountSummary({
          address: details.address,
          header: [
            details.name,
            details.commission ? `${this.decimalPipe.transform(new BigNumber(details.commission).times(100).toString())}%` : ''
          ],
          description: [this.shortenStringPipe.transform(details.address), '']
        })
    )
  }

  private async getExtraValidatorsDetails(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    validatorsDetails: SubstrateValidatorDetails[],
    nominatorDetails: SubstrateNominatorDetails,
    extraNominatorDetials: AirGapDelegatorDetails
  ): Promise<AirGapDelegateeDetails[]> {
    return Promise.all(
      validatorsDetails.map(async (validatorDetails: SubstrateValidatorDetails) => {
        const ownStash: BigNumber = new BigNumber(validatorDetails.ownStash ? validatorDetails.ownStash : 0)
        const totalStakingBalance: BigNumber = new BigNumber(
          validatorDetails.totalStakingBalance ? validatorDetails.totalStakingBalance : 0
        )

        const displayDetails: UIWidget[] = await this.createDelegateeDisplayDetails(
          protocol,
          validatorDetails,
          nominatorDetails,
          extraNominatorDetials
        )

        return {
          ...validatorDetails,
          name: validatorDetails.name || '',
          status: validatorDetails.status || 'delegation-detail-substrate.status.unknown',
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

  private async getAlerts(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    nominatorDetails: SubstrateNominatorDetails,
    validatorDetails: SubstrateValidatorDetails
  ): Promise<UIAlert[]> {
    const alerts: UIAlert[] = []

    const results = await Promise.all([
      protocol.options.nodeClient.getElectionStatus(),
      protocol.options.accountController.getNominationStatus(nominatorDetails.address, validatorDetails.address)
    ])
    const isElectionOpen: boolean = results[0] && results[0].status.value === SubstrateElectionStatus.OPEN
    const nominationStatus: SubstrateNominationStatus | undefined = results[1]

    if (protocol.identifier === MainProtocolSymbols.POLKADOT) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-substrate.alert.polkadot.delegation-issues.title',
          description: 'delegation-detail-substrate.alert.polkadot.delegation-issues.description',
          icon: 'alert-circle-outline',
          color: 'warning',
          actions: [
            {
              text: 'delegation-detail-substrate.alert.polkadot.delegation-issues.actions.open-blogpost',
              action: async () => {
                window.open('https://polkadot.network/polkadot-staking-an-update/', '_blank')
              }
            }
          ]
        })
      )
    }

    if (isElectionOpen) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-substrate.alert.election-open.title',
          description: 'delegation-detail-substrate.alert.election-open.description',
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    }

    if (nominationStatus === SubstrateNominationStatus.INACTIVE) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-substrate.alert.nomination-inactive.title',
          description: 'delegation-detail-substrate.alert.nomination-inactive.description',
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    } else if (nominationStatus === SubstrateNominationStatus.OVERSUBSCRIBED) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-substrate.alert.nomination-oversubscribed.title',
          description: 'delegation-detail-substrate.alert.nomination-oversubscribed.description',
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    } else if (nominationStatus === undefined && validatorDetails.nominators > 256) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-substrate.alert.validator-oversubscribed.title',
          description: 'delegation-detail-substrate.alert.validator-oversubscribed.description',
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    }

    return alerts
  }

  private async createDelegateeDisplayDetails(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    validatorDetails: SubstrateValidatorDetails,
    nominatorDetails: SubstrateNominatorDetails,
    extraNominatorDetails: AirGapDelegatorDetails
  ): Promise<UIWidget[]> {
    const details = []

    const commission = validatorDetails.commission ? new BigNumber(validatorDetails.commission) : null
    const totalPreviousReward = validatorDetails.lastEraReward ? new BigNumber(validatorDetails.lastEraReward.amount) : null

    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: commission ? this.decimalPipe.transform(commission.multipliedBy(100).toString()) + '%' : '-',
        description: 'delegation-detail-substrate.commission_label'
      })
    )

    const delegateAction = extraNominatorDetails.mainActions
      ? extraNominatorDetails.mainActions.find((action) => delegateActions.includes(action.type))
      : undefined

    const isNominated = nominatorDetails.delegatees.includes(validatorDetails.address)
    const showExpectedRewardWidget =
      !!totalPreviousReward &&
      !!commission &&
      validatorDetails.status === 'Active' &&
      !isNominated &&
      !!delegateAction &&
      !!delegateAction.form

    if (showExpectedRewardWidget) {
      const bonded = nominatorDetails.stakingDetails ? new BigNumber(nominatorDetails.stakingDetails.total) : new BigNumber(0)

      const getExpectedReward = async (userStake: BigNumber) => {
        const totalStake = new BigNumber(validatorDetails.totalStakingBalance).plus(userStake)
        const userShare = userStake.dividedBy(totalStake)
        const expectedReward = new BigNumber(1).minus(commission).multipliedBy(totalPreviousReward).multipliedBy(userShare)

        return this.amountConverterPipe.transform(expectedReward, {
          protocol
        })
      }

      const expectedRewardWidget = new UIIconText({
        iconName: 'logo-usd',
        text: await getExpectedReward(bonded),
        description: 'delegation-detail-substrate.expected-reward_label'
      })

      delegateAction.form.valueChanges.subscribe((value) => {
        expectedRewardWidget.doAfterReached(
          WidgetState.INIT,
          async () => {
            const userStake = bonded.plus(value[ArgumentName.VALUE] || 0)
            expectedRewardWidget.text = await getExpectedReward(userStake)
          },
          true
        )
      })

      details.push(expectedRewardWidget)
    }

    return details
  }

  private async getExtraNominatorDetails(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    nominatorDetails: SubstrateNominatorDetails,
    validators: string[]
  ): Promise<AirGapDelegatorDetails> {
    const availableActions = nominatorDetails.availableActions.filter((action) => supportedActions.includes(action.type))

    const delegateAction: AirGapDelegatorAction = await this.createDelegateAction(
      protocol,
      nominatorDetails.stakingDetails,
      availableActions,
      nominatorDetails.address,
      validators
    )

    const undelegateAction: AirGapDelegatorAction = this.createUndelegateAction(nominatorDetails.stakingDetails, availableActions)
    const extraActions: AirGapDelegatorAction[] = await this.createDelegatorExtraActions(
      protocol,
      nominatorDetails.stakingDetails,
      availableActions
    )
    const displayDetails: UIWidget[] = await this.createDelegatorDisplayDetails(protocol, nominatorDetails)

    return {
      ...nominatorDetails,
      mainActions: [delegateAction, ...extraActions].filter((action) => !!action),
      secondaryActions: [undelegateAction].filter((action) => !!action),
      displayDetails
    }
  }

  // tslint:disable-next-line: cyclomatic-complexity
  private async createDelegateAction(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    stakingDetails: SubstrateStakingDetails,
    availableActions: DelegatorAction[],
    nominatorAddress: string,
    validators: string[]
  ): Promise<AirGapDelegatorAction | null> {
    const actions = availableActions
      .filter((action) => delegateActions.includes(action.type))
      .sort((a1, a2) => delegateActions.indexOf(a1.type) - delegateActions.indexOf(a2.type))

    const action = actions[0]

    const [maxValue, minValue]: [BigNumber | undefined, BigNumber | undefined] = await Promise.all([
      action ? this.getMaxDelegationValue(protocol, action.type, nominatorAddress) : undefined,
      action ? this.getMinDelegationValue(protocol, action.type) : undefined
    ])

    if (action) {
      const hasSufficientFunds: boolean = maxValue === undefined || minValue === undefined || maxValue.gte(minValue)

      const maxValueShifted: BigNumber | undefined =
        maxValue !== undefined ? maxValue.integerValue().shiftedBy(-protocol.decimals) : undefined
      const minValueShifted: BigNumber | undefined =
        minValue !== undefined ? minValue.integerValue().shiftedBy(-protocol.decimals) : undefined

      const extraValidators = []
      if (minValueShifted !== undefined) {
        extraValidators.push(Validators.min(new BigNumber(minValueShifted).toNumber()))
      }
      if (maxValueShifted !== undefined) {
        extraValidators.push(Validators.max(new BigNumber(maxValueShifted).toNumber()))
      }

      const form = this.formBuilder.group({
        [ArgumentName.TARGETS]: [validators],
        [ArgumentName.VALUE]: [
          action.args.includes(ArgumentName.VALUE) && maxValue !== undefined ? maxValue.toString() : stakingDetails.active
        ],
        [ArgumentName.VALUE_CONTROL]: [
          maxValueShifted ? maxValueShifted.toFixed() : minValueShifted ? minValueShifted.toFixed() : '0',
          Validators.compose([Validators.required, DecimalValidator.validate(protocol.decimals), ...extraValidators])
        ],
        [ArgumentName.PAYEE]: [SubstratePayee.STASH]
      })

      if (!hasSufficientFunds) {
        form.get(ArgumentName.VALUE_CONTROL).disable()
      }

      const argWidgets = []
      if (action.args.includes(ArgumentName.VALUE)) {
        argWidgets.push(
          this.createAmountWidget(
            ArgumentName.VALUE_CONTROL,
            maxValueShifted ? maxValueShifted.toFixed() : undefined,
            minValueShifted ? minValueShifted.toFixed() : undefined,
            {
              onValueChanged: (value: string) => {
                form.patchValue({ [ArgumentName.VALUE]: new BigNumber(value).shiftedBy(protocol.decimals).toFixed() })
              },
              toggleFixedValueButton:
                maxValueShifted !== undefined && hasSufficientFunds ? 'delegation-detail.max-amount_button' : undefined,
              fixedValue: maxValueShifted && hasSufficientFunds ? maxValueShifted.toString() : undefined
            }
          )
        )
      }

      const description = await this.createDelegateActionDescription(
        protocol,
        nominatorAddress,
        action.type,
        stakingDetails ? stakingDetails.active : 0,
        hasSufficientFunds,
        minValue,
        maxValue
      )

      return {
        type: action.type,
        label: 'delegation-detail-substrate.delegate.label',
        description,
        form,
        args: argWidgets,
        disabled: !hasSufficientFunds
      }
    }

    return null
  }

  private async getMaxDelegationValue(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    actionType: SubstrateStakingActionType,
    nominatorAddress: string
  ): Promise<BigNumber | undefined> {
    switch (actionType) {
      case SubstrateStakingActionType.REBOND_NOMINATE:
      case SubstrateStakingActionType.REBOND_EXTRA:
        const [unlocking, maxUnlocked]: [BigNumber, BigNumber] = await Promise.all([
          protocol.options.accountController.getUnlockingBalance(nominatorAddress).then((unlocking) => new BigNumber(unlocking)),
          protocol
            .estimateMaxDelegationValueFromAddress(nominatorAddress)
            .then((max: string) => new BigNumber(max))
            .catch(() => undefined)
        ])

        if (maxUnlocked === undefined) {
          return undefined
        }

        return maxUnlocked.gt(0) ? maxUnlocked.plus(unlocking) : new BigNumber(0)
      default:
        const maxValue = await protocol.estimateMaxDelegationValueFromAddress(nominatorAddress).catch(() => undefined)

        return maxValue !== undefined ? new BigNumber(maxValue) : undefined
    }
  }

  private async getMinDelegationValue(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    actionType: SubstrateStakingActionType
  ): Promise<BigNumber | undefined> {
    switch (actionType) {
      case SubstrateStakingActionType.BOND_NOMINATE:
        return new BigNumber(await protocol.options.nodeClient.getExistentialDeposit())
      case SubstrateStakingActionType.NOMINATE:
        return new BigNumber(0)
      default:
        return new BigNumber(1)
    }
  }

  private async createDelegateActionDescription(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    address: string,
    actionType: SubstrateStakingActionType,
    bonded: string | number | BigNumber,
    hasSufficientFunds: boolean,
    minValue?: string | number | BigNumber | undefined,
    maxValue?: string | number | BigNumber | undefined
  ): Promise<string | undefined> {
    if (!hasSufficientFunds) {
      const futureTransactions = await protocol.getFutureRequiredTransactions(address, 'delegate')
      const feeEstimation = await protocol.options.transactionController.estimateTransactionFees(address, futureTransactions)
      const feeEstimationFormatted = await this.amountConverterPipe.transform(feeEstimation, { protocol })

      return this.translateService.instant('delegation-detail-substrate.delegate.unsufficient-funds_text', {
        extra: feeEstimationFormatted,
        symbol: protocol.marketSymbol.toLocaleUpperCase()
      })
    }

    const bondedFormatted = await this.amountConverterPipe.transform(bonded, {
      protocol
    })

    const minValueFormatted =
      minValue !== undefined
        ? await this.amountConverterPipe.transform(minValue, {
            protocol,
            maxDigits: protocol.decimals
          })
        : undefined

    const maxValueFormatted =
      maxValue !== undefined
        ? await this.amountConverterPipe.transform(maxValue, {
            protocol,
            maxDigits: protocol.decimals
          })
        : undefined

    let translationKey: string
    let translationArgs: any = {}
    switch (actionType) {
      case SubstrateStakingActionType.BOND_NOMINATE:
        if (maxValueFormatted) {
          translationKey = 'delegation-detail-substrate.delegate.bond-nominate_text'
          translationArgs = {
            minDelegation: minValueFormatted,
            maxDelegation: maxValueFormatted
          }
        } else {
          translationKey = 'delegation-detail-substrate.delegate.bond-nominate-no-max_text'
        }
        break
      case SubstrateStakingActionType.REBOND_NOMINATE:
        if (maxValueFormatted) {
          translationKey = 'delegation-detail-substrate.delegate.rebond-nominate_text'
          translationArgs = { maxDelegation: maxValueFormatted }
        } else {
          translationKey = 'delegation-detail-substrate.delegate.rebond-nominate-no-max_text'
        }
        break
      case SubstrateStakingActionType.NOMINATE:
        translationKey = 'delegation-detail-substrate.delegate.nominate_text'
        translationArgs = { bonded: bondedFormatted }
        break
      case SubstrateStakingActionType.BOND_EXTRA:
        if (maxValueFormatted) {
          translationKey = 'delegation-detail-substrate.delegate.bond-extra_text'
          translationArgs = {
            bonded: bondedFormatted,
            maxDelegation: maxValueFormatted
          }
        } else {
          translationKey = 'delegation-detail-substrate.delegate.bond-extra-no-max_text'
          translationArgs = {
            bonded: bondedFormatted,
            symbol: protocol.marketSymbol.toLocaleUpperCase()
          }
        }
        break
      case SubstrateStakingActionType.REBOND_EXTRA:
        if (maxValueFormatted) {
          translationKey = 'delegation-detail-substrate.delegate.rebond-extra_text'
          translationArgs = {
            bonded: bondedFormatted,
            maxDelegation: maxValueFormatted
          }
        } else {
          translationKey = 'delegation-detail-substrate.delegate.rebond-extra-no-max_text'
          translationArgs = {
            bonded: bondedFormatted,
            symbol: protocol.marketSymbol.toLocaleUpperCase()
          }
        }
        break
      case SubstrateStakingActionType.CHANGE_NOMINATION:
        translationKey = 'delegation-detail-substrate.delegate.change-nomination_text'
        translationArgs = { bonded: bondedFormatted }
        break
      default:
        return undefined
    }

    return this.translateService.instant(translationKey, translationArgs)
  }

  private createUndelegateAction(
    stakingDetails: SubstrateStakingDetails | null,
    availableActions: DelegatorAction[]
  ): AirGapDelegatorAction | null {
    const actions = availableActions
      .filter((action) => undelegateActions.includes(action.type))
      .sort((a1, a2) => undelegateActions.indexOf(a1.type) - undelegateActions.indexOf(a2.type))

    const action = actions[0]

    if (action && stakingDetails) {
      const form = this.formBuilder.group({
        [ArgumentName.VALUE]: [stakingDetails.active]
      })

      const label = this.createUndelegateActionLabel(action.type)

      return {
        type: action.type,
        label,
        iconName: 'close-outline',
        form
      }
    }

    return null
  }

  private createUndelegateActionLabel(actionType: SubstrateStakingActionType): string | undefined {
    switch (actionType) {
      case SubstrateStakingActionType.CANCEL_NOMINATION:
        return 'delegation-detail-substrate.undelegate.label'
      case SubstrateStakingActionType.UNBOND:
        return 'delegation-detail-substrate.unbond.label'
      default:
        return undefined
    }
  }

  private async createDelegatorExtraActions(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    stakingDetails: SubstrateStakingDetails | undefined,
    availableActions: DelegatorAction[]
  ): Promise<AirGapDelegatorAction[]> {
    return Promise.all(
      availableActions
        .filter((action) => !delegateActions.includes(action.type) && !undelegateActions.includes(action.type))
        .map(async (action) => {
          let label: string
          let confirmLabel: string
          let description: string
          let args: UIInputWidget<any>[]

          // tslint:disable-next-line: switch-default
          switch (action.type) {
            case SubstrateStakingActionType.WITHDRAW_UNBONDED:
              const totalUnlockedFormatted: string | undefined = stakingDetails
                ? await this.amountConverterPipe.transform(stakingDetails.unlocked, {
                    protocol
                  })
                : undefined

              label = 'delegation-detail-substrate.withdraw-unbonded.label'
              confirmLabel = 'delegation-detail-substrate.withdraw-unbonded.button'
              description = totalUnlockedFormatted
                ? this.translateService.instant('delegation-detail-substrate.withdraw-unbonded.text-full', {
                    unlocked: totalUnlockedFormatted
                  })
                : 'delegation-detail-substrate.withdraw-unbonded.text-short'

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
    )
  }

  private async createDelegatorDisplayDetails(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    nominatorDetails: SubstrateNominatorDetails
  ): Promise<UIWidget[]> {
    const displayDetails = []
    const isDelegating = nominatorDetails.delegatees.length > 0

    if (nominatorDetails.stakingDetails) {
      displayDetails.push(...(await this.createStakingDetailsWidgets(protocol, isDelegating, nominatorDetails.stakingDetails)))
    }

    return displayDetails
  }

  private async createStakingDetailsWidgets(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    isNominating: boolean,
    stakingDetails: SubstrateStakingDetails
  ): Promise<UIWidget[]> {
    const details = []

    details.push(...(await this.createBondedDetails(protocol, stakingDetails)))

    if (isNominating) {
      details.push(...this.createNominationDetails(protocol, stakingDetails))
    }

    return details
  }

  private async createDelegatorDisplayRewards(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    nominatorDetails: SubstrateNominatorDetails
  ): Promise<UIRewardList | undefined> {
    if (nominatorDetails.delegatees.length === 0 || nominatorDetails.stakingDetails.rewards.length === 0) {
      return undefined
    }

    return new UIRewardList({
      rewards: await Promise.all(
        nominatorDetails.stakingDetails.rewards.slice(0, 5).map(async (reward) => ({
          index: reward.eraIndex,
          amount: await this.amountConverterPipe.transform(reward.amount, {
            protocol
          }),
          timestamp: reward.timestamp
        }))
      ),
      indexColLabel: 'delegation-detail-substrate.rewards.index-col_label',
      amountColLabel: 'delegation-detail-substrate.rewards.amount-col_label',
      payoutColLabel: 'delegation-detail-substrate.rewards.payout-col_label'
    })
  }

  private async createBondedDetails(
    protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    stakingDetails: SubstrateStakingDetails
  ): Promise<UIWidget[]> {
    const details = []

    const activeStaking = new BigNumber(stakingDetails.active)
    const totalUnlocked = new BigNumber(stakingDetails.unlocked)

    if (activeStaking.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: await this.amountConverterPipe.transform(activeStaking, {
            protocol
          }),
          description:
            stakingDetails.status === 'nominating'
              ? 'delegation-detail-substrate.delegated_label'
              : 'delegation-detail-substrate.bonded_label'
        })
      )
    }

    if (stakingDetails.locked.length > 0) {
      const nextUnlocking = stakingDetails.locked.sort((a, b) => a.expectedUnlock - b.expectedUnlock)[0]
      const unlockingDate = new Date(nextUnlocking.expectedUnlock)

      const nextUnlockingValue = new BigNumber(nextUnlocking.value)

      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: await this.amountConverterPipe.transform(nextUnlockingValue, {
            protocol
          }),
          description: 'delegation-detail-substrate.locked_label'
        }),
        new UIIconText({
          iconName: 'alarm-outline',
          text: `${moment(unlockingDate).fromNow()} (${moment(unlockingDate).format('LLL')})`,
          description: 'delegation-detail-substrate.withdraw-ready_label'
        })
      )
    } else if (totalUnlocked.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: await this.amountConverterPipe.transform(totalUnlocked, {
            protocol
          }),
          description: 'delegation-detail-substrate.withdraw-ready_label'
        })
      )
    }

    return details
  }

  private createNominationDetails(
    _protocol: SubstrateDelegateProtocol<SubstrateNetwork>,
    stakingDetails: SubstrateStakingDetails
  ): UIWidget[] {
    const details = []

    const nextEraDate = new Date(stakingDetails.nextEra)

    let nextEraLabel: string | undefined
    switch (stakingDetails.status) {
      case 'nominating':
        nextEraLabel = 'delegation-detail-substrate.next-payout_label'
        break
      case 'nominating_waiting':
        nextEraLabel = 'delegation-detail-substrate.becomes-active_label'
        break
      case 'nominating_inactive':
        nextEraLabel = 'delegation-detail-substrate.next-era_label'
        break
      default:
        nextEraLabel = undefined
    }

    if (nextEraLabel) {
      details.push(
        new UIIconText({
          iconName: 'sync-outline',
          text: `${moment(nextEraDate).fromNow()} (${moment(nextEraDate).format('LLL')})`,
          description: nextEraLabel
        })
      )
    }

    return details
  }
}
