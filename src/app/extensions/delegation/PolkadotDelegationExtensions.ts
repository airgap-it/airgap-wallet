import { AmountConverterPipe, ICoinDelegateProtocolAdapter } from '@airgap/angular-core'
import { MainProtocolSymbols } from '@airgap/coinlib-core'
import { DelegatorAction } from '@airgap/coinlib-core/protocols/ICoinDelegateProtocol'
import {
  PolkadotElectionStatus,
  PolkadotNominationStatus,
  PolkadotNominatorDetails,
  PolkadotPayee,
  PolkadotStakingActionType,
  PolkadotStakingDetails,
  PolkadotValidatorDetails
} from '@airgap/polkadot'
import { PolkadotBaseProtocol } from '@airgap/polkadot/v1/protocol/PolkadotBaseProtocol'
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
} from '../../interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountSummary } from '../../models/widgets/display/UIAccountSummary'
import { UIAlert } from '../../models/widgets/display/UIAlert'
import { UIIconText } from '../../models/widgets/display/UIIconText'
import { UIRewardList } from '../../models/widgets/display/UIRewardList'
import { UIInputWidget } from '../../models/widgets/UIInputWidget'
import { UIWidget, WidgetState } from '../../models/widgets/UIWidget'
import { ShortenStringPipe } from '../../pipes/shorten-string/shorten-string.pipe'
import { DecimalValidator } from '../../validators/DecimalValidator'

import { V1ProtocolDelegationExtensions } from './base/V1ProtocolDelegationExtensions'

// sorted by priority
const delegateActions = [
  PolkadotStakingActionType.BOND_NOMINATE,
  PolkadotStakingActionType.REBOND_NOMINATE,
  PolkadotStakingActionType.NOMINATE,
  PolkadotStakingActionType.CHANGE_NOMINATION,
  PolkadotStakingActionType.BOND_EXTRA,
  PolkadotStakingActionType.REBOND_EXTRA
]

// sorted by priority
const undelegateActions = [PolkadotStakingActionType.CANCEL_NOMINATION, PolkadotStakingActionType.UNBOND]

const supportedActions = [...delegateActions, ...undelegateActions, PolkadotStakingActionType.WITHDRAW_UNBONDED]

enum ArgumentName {
  TARGETS = 'targets',
  VALUE = 'value',
  VALUE_CONTROL = 'valueControl',
  PAYEE = 'payee'
}

export class PolkadotDelegationExtensions extends V1ProtocolDelegationExtensions<PolkadotBaseProtocol> {
  private static instance: PolkadotDelegationExtensions

  public static create(
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverterPipe: AmountConverterPipe,
    shortenStringPipe: ShortenStringPipe,
    translateService: TranslateService
  ): PolkadotDelegationExtensions {
    if (!PolkadotDelegationExtensions.instance) {
      PolkadotDelegationExtensions.instance = new PolkadotDelegationExtensions(
        formBuilder,
        decimalPipe,
        amountConverterPipe,
        shortenStringPipe,
        translateService
      )
    }

    return PolkadotDelegationExtensions.instance
  }

  public airGapDelegatee(_adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>): string | undefined {
    return undefined
  }

  public delegateeLabel: string = 'delegation-detail-polkadot.delegatee-label'
  public delegateeLabelPlural: string = 'delegation-detail-polkadot.delegatee-label-plural'
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
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    _publicKey: string,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const [nominatorDetails, validatorsDetails]: [PolkadotNominatorDetails, PolkadotValidatorDetails[]] = await Promise.all([
      adapter.protocolV1.getNominatorDetails(delegator, delegatees),
      Promise.all(delegatees.map((validator: string) => adapter.protocolV1.getValidatorDetails(validator)))
    ])

    const extraNominatorDetails: AirGapDelegatorDetails = await this.getExtraNominatorDetails(adapter, nominatorDetails, delegatees)
    const extraValidatorsDetails: AirGapDelegateeDetails[] = await this.getExtraValidatorsDetails(
      adapter,
      validatorsDetails,
      nominatorDetails,
      extraNominatorDetails
    )

    const alerts: UIAlert[] = (
      await Promise.all(
        validatorsDetails.map((validatorDetails: PolkadotValidatorDetails) => this.getAlerts(adapter, nominatorDetails, validatorDetails))
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
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    delegator: string,
    delegatees: string[]
  ): Promise<UIRewardList | undefined> {
    const nominatorDetails = await adapter.protocolV1.getNominatorDetails(delegator, delegatees)

    return this.createDelegatorDisplayRewards(adapter, nominatorDetails)
  }

  public async createDelegateesSummary(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    delegatees: string[]
  ): Promise<UIAccountSummary[]> {
    const delegateesDetails: PolkadotValidatorDetails[] = await Promise.all(
      delegatees.map((delegatee) => adapter.protocolV1.getValidatorDetails(delegatee))
    )

    return delegateesDetails.map(
      (details: PolkadotValidatorDetails) =>
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
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    validatorsDetails: PolkadotValidatorDetails[],
    nominatorDetails: PolkadotNominatorDetails,
    extraNominatorDetials: AirGapDelegatorDetails
  ): Promise<AirGapDelegateeDetails[]> {
    return Promise.all(
      validatorsDetails.map(async (validatorDetails: PolkadotValidatorDetails) => {
        const ownStash: BigNumber = new BigNumber(validatorDetails.ownStash ? validatorDetails.ownStash : 0)
        const totalStakingBalance: BigNumber = new BigNumber(
          validatorDetails.totalStakingBalance ? validatorDetails.totalStakingBalance : 0
        )

        const displayDetails: UIWidget[] = await this.createDelegateeDisplayDetails(
          adapter,
          validatorDetails,
          nominatorDetails,
          extraNominatorDetials
        )

        return {
          ...validatorDetails,
          name: validatorDetails.name || '',
          status: validatorDetails.status || 'delegation-detail-polkadot.status.unknown',
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
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    nominatorDetails: PolkadotNominatorDetails,
    validatorDetails: PolkadotValidatorDetails
  ): Promise<UIAlert[]> {
    const alerts: UIAlert[] = []

    const results = await Promise.all([
      adapter.protocolV1.getElectionStatus(),
      adapter.protocolV1.getNominationStatus(nominatorDetails.address, validatorDetails.address)
    ])
    const isElectionOpen: boolean = results[0] === PolkadotElectionStatus.OPEN
    const nominationStatus: PolkadotNominationStatus | undefined = results[1]

    if (adapter.identifier === MainProtocolSymbols.POLKADOT) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-polkadot.alert.polkadot.delegation-issues.title',
          description: 'delegation-detail-polkadot.alert.polkadot.delegation-issues.description',
          icon: 'alert-circle-outline',
          color: 'warning',
          actions: [
            {
              text: 'delegation-detail-polkadot.alert.polkadot.delegation-issues.actions.open-blogpost',
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
          title: 'delegation-detail-polkadot.alert.election-open.title',
          description: 'delegation-detail-polkadot.alert.election-open.description',
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    }

    if (nominationStatus === PolkadotNominationStatus.INACTIVE) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-polkadot.alert.nomination-inactive.title',
          description: 'delegation-detail-polkadot.alert.nomination-inactive.description',
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    } else if (nominationStatus === PolkadotNominationStatus.OVERSUBSCRIBED) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-polkadot.alert.nomination-oversubscribed.title',
          description: 'delegation-detail-polkadot.alert.nomination-oversubscribed.description',
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    } else if (nominationStatus === undefined && validatorDetails.nominators > 256) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-polkadot.alert.validator-oversubscribed.title',
          description: 'delegation-detail-polkadot.alert.validator-oversubscribed.description',
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    }

    return alerts
  }

  private async createDelegateeDisplayDetails(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    validatorDetails: PolkadotValidatorDetails,
    nominatorDetails: PolkadotNominatorDetails,
    extraNominatorDetails: AirGapDelegatorDetails
  ): Promise<UIWidget[]> {
    const details = []

    const commission = validatorDetails.commission ? new BigNumber(validatorDetails.commission) : null
    const totalPreviousReward = validatorDetails.lastEraReward ? new BigNumber(validatorDetails.lastEraReward.amount) : null

    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: commission ? this.decimalPipe.transform(commission.multipliedBy(100).toString()) + '%' : '-',
        description: 'delegation-detail-polkadot.commission_label'
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
          protocol: adapter
        })
      }

      const expectedRewardWidget = new UIIconText({
        iconName: 'logo-usd',
        text: await getExpectedReward(bonded),
        description: 'delegation-detail-polkadot.expected-reward_label'
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
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    nominatorDetails: PolkadotNominatorDetails,
    validators: string[]
  ): Promise<AirGapDelegatorDetails> {
    const availableActions = nominatorDetails.availableActions.filter((action) => supportedActions.includes(action.type))

    const delegateAction: AirGapDelegatorAction = await this.createDelegateAction(
      adapter,
      nominatorDetails.stakingDetails,
      availableActions,
      nominatorDetails.address,
      validators
    )

    const undelegateAction: AirGapDelegatorAction = this.createUndelegateAction(nominatorDetails.stakingDetails, availableActions)
    const extraActions: AirGapDelegatorAction[] = await this.createDelegatorExtraActions(
      adapter,
      nominatorDetails.stakingDetails,
      availableActions
    )
    const displayDetails: UIWidget[] = await this.createDelegatorDisplayDetails(adapter, nominatorDetails)

    return {
      ...nominatorDetails,
      mainActions: [delegateAction, ...extraActions].filter((action) => !!action),
      secondaryActions: [undelegateAction].filter((action) => !!action),
      displayDetails
    }
  }

  // tslint:disable-next-line: cyclomatic-complexity
  private async createDelegateAction(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    stakingDetails: PolkadotStakingDetails,
    availableActions: DelegatorAction[],
    nominatorAddress: string,
    validators: string[]
  ): Promise<AirGapDelegatorAction | null> {
    const actions = availableActions
      .filter((action) => delegateActions.includes(action.type))
      .sort((a1, a2) => delegateActions.indexOf(a1.type) - delegateActions.indexOf(a2.type))

    const action = actions[0]

    const [maxValue, minValue]: [BigNumber | undefined, BigNumber | undefined] = await Promise.all([
      action ? this.getMaxDelegationValue(adapter, action.type, nominatorAddress) : undefined,
      action ? this.getMinDelegationValue(adapter, action.type) : undefined
    ])

    if (action) {
      const hasSufficientFunds: boolean = maxValue === undefined || minValue === undefined || maxValue.gte(minValue)

      const maxValueShifted: BigNumber | undefined =
        maxValue !== undefined ? maxValue.integerValue().shiftedBy(-adapter.decimals) : undefined
      const minValueShifted: BigNumber | undefined =
        minValue !== undefined ? minValue.integerValue().shiftedBy(-adapter.decimals) : undefined

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
          Validators.compose([Validators.required, DecimalValidator.validate(adapter.decimals), ...extraValidators])
        ],
        [ArgumentName.PAYEE]: [PolkadotPayee.STASH]
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
                form.patchValue({ [ArgumentName.VALUE]: new BigNumber(value).shiftedBy(adapter.decimals).toFixed() })
              },
              toggleFixedValueButton:
                maxValueShifted !== undefined && hasSufficientFunds ? 'delegation-detail.max-amount_button' : undefined,
              fixedValue: maxValueShifted && hasSufficientFunds ? maxValueShifted.toString() : undefined
            }
          )
        )
      }

      const description = await this.createDelegateActionDescription(
        adapter,
        nominatorAddress,
        action.type,
        stakingDetails ? stakingDetails.active : 0,
        hasSufficientFunds,
        minValue,
        maxValue
      )

      return {
        type: action.type,
        label: 'delegation-detail-polkadot.delegate.label',
        description,
        form,
        args: argWidgets,
        disabled: !hasSufficientFunds
      }
    }

    return null
  }

  private async getMaxDelegationValue(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    actionType: PolkadotStakingActionType,
    nominatorAddress: string
  ): Promise<BigNumber | undefined> {
    switch (actionType) {
      case PolkadotStakingActionType.REBOND_NOMINATE:
      case PolkadotStakingActionType.REBOND_EXTRA:
        const [unlocking, maxUnlocked]: [BigNumber, BigNumber] = await Promise.all([
          adapter.protocolV1.getUnlockingBalance(nominatorAddress).then((unlocking) => new BigNumber(unlocking.value)),
          adapter.protocolV1
            .getMaxDelegationValueWithAddress(nominatorAddress)
            .then((max: string) => new BigNumber(max))
            .catch(() => undefined)
        ])

        if (maxUnlocked === undefined) {
          return undefined
        }

        return maxUnlocked.gt(0) ? maxUnlocked.plus(unlocking) : new BigNumber(0)
      default:
        const maxValue = await adapter.protocolV1.getMaxDelegationValueWithAddress(nominatorAddress).catch(() => undefined)

        return maxValue !== undefined ? new BigNumber(maxValue) : undefined
    }
  }

  private async getMinDelegationValue(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    actionType: PolkadotStakingActionType
  ): Promise<BigNumber | undefined> {
    switch (actionType) {
      case PolkadotStakingActionType.BOND_NOMINATE:
        const existentialDeposit = await adapter.protocolV1.getExistentialDeposit()
        return new BigNumber(existentialDeposit.value)
      case PolkadotStakingActionType.NOMINATE:
        return new BigNumber(0)
      default:
        return new BigNumber(1)
    }
  }

  private async createDelegateActionDescription(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    address: string,
    actionType: PolkadotStakingActionType,
    bonded: string | number | BigNumber,
    hasSufficientFunds: boolean,
    minValue?: string | number | BigNumber | undefined,
    maxValue?: string | number | BigNumber | undefined
  ): Promise<string | undefined> {
    if (!hasSufficientFunds) {
      const feeEstimation = await adapter.protocolV1.getFutureStakingTransactionsFee(address)
      const feeEstimationFormatted = await this.amountConverterPipe.transform(feeEstimation.value, { protocol: adapter })

      return this.translateService.instant('delegation-detail-polkadot.delegate.unsufficient-funds_text', {
        extra: feeEstimationFormatted,
        symbol: adapter.marketSymbol.toLocaleUpperCase()
      })
    }

    const bondedFormatted = await this.amountConverterPipe.transform(bonded, {
      protocol: adapter
    })

    const minValueFormatted =
      minValue !== undefined
        ? await this.amountConverterPipe.transform(minValue, {
            protocol: adapter,
            maxDigits: adapter.decimals
          })
        : undefined

    const maxValueFormatted =
      maxValue !== undefined
        ? await this.amountConverterPipe.transform(maxValue, {
            protocol: adapter,
            maxDigits: adapter.decimals
          })
        : undefined

    let translationKey: string
    let translationArgs: any = {}
    switch (actionType) {
      case PolkadotStakingActionType.BOND_NOMINATE:
        if (maxValueFormatted) {
          translationKey = 'delegation-detail-polkadot.delegate.bond-nominate_text'
          translationArgs = {
            minDelegation: minValueFormatted,
            maxDelegation: maxValueFormatted
          }
        } else {
          translationKey = 'delegation-detail-polkadot.delegate.bond-nominate-no-max_text'
        }
        break
      case PolkadotStakingActionType.REBOND_NOMINATE:
        if (maxValueFormatted) {
          translationKey = 'delegation-detail-polkadot.delegate.rebond-nominate_text'
          translationArgs = { maxDelegation: maxValueFormatted }
        } else {
          translationKey = 'delegation-detail-polkadot.delegate.rebond-nominate-no-max_text'
        }
        break
      case PolkadotStakingActionType.NOMINATE:
        translationKey = 'delegation-detail-polkadot.delegate.nominate_text'
        translationArgs = { bonded: bondedFormatted }
        break
      case PolkadotStakingActionType.BOND_EXTRA:
        if (maxValueFormatted) {
          translationKey = 'delegation-detail-polkadot.delegate.bond-extra_text'
          translationArgs = {
            bonded: bondedFormatted,
            maxDelegation: maxValueFormatted
          }
        } else {
          translationKey = 'delegation-detail-polkadot.delegate.bond-extra-no-max_text'
          translationArgs = {
            bonded: bondedFormatted,
            symbol: adapter.marketSymbol.toLocaleUpperCase()
          }
        }
        break
      case PolkadotStakingActionType.REBOND_EXTRA:
        if (maxValueFormatted) {
          translationKey = 'delegation-detail-polkadot.delegate.rebond-extra_text'
          translationArgs = {
            bonded: bondedFormatted,
            maxDelegation: maxValueFormatted
          }
        } else {
          translationKey = 'delegation-detail-polkadot.delegate.rebond-extra-no-max_text'
          translationArgs = {
            bonded: bondedFormatted,
            symbol: adapter.marketSymbol.toLocaleUpperCase()
          }
        }
        break
      case PolkadotStakingActionType.CHANGE_NOMINATION:
        translationKey = 'delegation-detail-polkadot.delegate.change-nomination_text'
        translationArgs = { bonded: bondedFormatted }
        break
      default:
        return undefined
    }

    return this.translateService.instant(translationKey, translationArgs)
  }

  private createUndelegateAction(
    stakingDetails: PolkadotStakingDetails | null,
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

  private createUndelegateActionLabel(actionType: PolkadotStakingActionType): string | undefined {
    switch (actionType) {
      case PolkadotStakingActionType.CANCEL_NOMINATION:
        return 'delegation-detail-polkadot.undelegate.label'
      case PolkadotStakingActionType.UNBOND:
        return 'delegation-detail-polkadot.unbond.label'
      default:
        return undefined
    }
  }

  private async createDelegatorExtraActions(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    stakingDetails: PolkadotStakingDetails | undefined,
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
            case PolkadotStakingActionType.WITHDRAW_UNBONDED:
              const totalUnlockedFormatted: string | undefined = stakingDetails
                ? await this.amountConverterPipe.transform(stakingDetails.unlocked, {
                    protocol: adapter
                  })
                : undefined

              label = 'delegation-detail-polkadot.withdraw-unbonded.label'
              confirmLabel = 'delegation-detail-polkadot.withdraw-unbonded.button'
              description = totalUnlockedFormatted
                ? this.translateService.instant('delegation-detail-polkadot.withdraw-unbonded.text-full', {
                    unlocked: totalUnlockedFormatted
                  })
                : 'delegation-detail-polkadot.withdraw-unbonded.text-short'

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
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    nominatorDetails: PolkadotNominatorDetails
  ): Promise<UIWidget[]> {
    const displayDetails = []
    const isDelegating = nominatorDetails.delegatees.length > 0

    if (nominatorDetails.stakingDetails) {
      displayDetails.push(...(await this.createStakingDetailsWidgets(adapter, isDelegating, nominatorDetails.stakingDetails)))
    }

    return displayDetails
  }

  private async createStakingDetailsWidgets(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    isNominating: boolean,
    stakingDetails: PolkadotStakingDetails
  ): Promise<UIWidget[]> {
    const details = []

    details.push(...(await this.createBondedDetails(adapter, stakingDetails)))

    if (isNominating) {
      details.push(...this.createNominationDetails(adapter, stakingDetails))
    }

    return details
  }

  private async createDelegatorDisplayRewards(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    nominatorDetails: PolkadotNominatorDetails
  ): Promise<UIRewardList | undefined> {
    if (nominatorDetails.delegatees.length === 0 || nominatorDetails.stakingDetails.rewards.length === 0) {
      return undefined
    }

    return new UIRewardList({
      rewards: await Promise.all(
        nominatorDetails.stakingDetails.rewards.slice(0, 5).map(async (reward) => ({
          index: reward.eraIndex,
          amount: await this.amountConverterPipe.transform(reward.amount, {
            protocol: adapter
          }),
          timestamp: reward.timestamp
        }))
      ),
      indexColLabel: 'delegation-detail-polkadot.rewards.index-col_label',
      amountColLabel: 'delegation-detail-polkadot.rewards.amount-col_label',
      payoutColLabel: 'delegation-detail-polkadot.rewards.payout-col_label'
    })
  }

  private async createBondedDetails(
    adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    stakingDetails: PolkadotStakingDetails
  ): Promise<UIWidget[]> {
    const details = []

    const activeStaking = new BigNumber(stakingDetails.active)
    const totalUnlocked = new BigNumber(stakingDetails.unlocked)

    if (activeStaking.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: await this.amountConverterPipe.transform(activeStaking, {
            protocol: adapter
          }),
          description:
            stakingDetails.status === 'nominating'
              ? 'delegation-detail-polkadot.delegated_label'
              : 'delegation-detail-polkadot.bonded_label'
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
            protocol: adapter
          }),
          description: 'delegation-detail-polkadot.locked_label'
        }),
        new UIIconText({
          iconName: 'alarm-outline',
          text: `${moment(unlockingDate).fromNow()} (${moment(unlockingDate).format('LLL')})`,
          description: 'delegation-detail-polkadot.withdraw-ready_label'
        })
      )
    } else if (totalUnlocked.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: await this.amountConverterPipe.transform(totalUnlocked, {
            protocol: adapter
          }),
          description: 'delegation-detail-polkadot.withdraw-ready_label'
        })
      )
    }

    return details
  }

  private createNominationDetails(
    _adapter: ICoinDelegateProtocolAdapter<PolkadotBaseProtocol>,
    stakingDetails: PolkadotStakingDetails
  ): UIWidget[] {
    const details = []

    const nextEraDate = new Date(stakingDetails.nextEra)

    let nextEraLabel: string | undefined
    switch (stakingDetails.status) {
      case 'nominating':
        nextEraLabel = 'delegation-detail-polkadot.next-payout_label'
        break
      case 'nominating_waiting':
        nextEraLabel = 'delegation-detail-polkadot.becomes-active_label'
        break
      case 'nominating_inactive':
        nextEraLabel = 'delegation-detail-polkadot.next-era_label'
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
