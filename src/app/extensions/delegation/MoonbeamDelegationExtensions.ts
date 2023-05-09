import { AmountConverterPipe } from '@airgap/angular-core'
import { DelegateeDetails, DelegatorAction, DelegatorDetails } from '@airgap/coinlib-core'
import { MoonbeamProtocol } from '@airgap/moonbeam'
import { MoonbeamCollatorDetails } from '@airgap/moonbeam/v0/protocol/moonbeam/data/staking/MoonbeamCollatorDetails'
import { MoonbeamDelegationDetails } from '@airgap/moonbeam/v0/protocol/moonbeam/data/staking/MoonbeamDelegationDetails'
import { MoonbeamDelegatorDetails } from '@airgap/moonbeam/v0/protocol/moonbeam/data/staking/MoonbeamDelegatorDetails'
import { MoonbeamStakingActionType } from '@airgap/moonbeam/v0/protocol/moonbeam/data/staking/MoonbeamStakingActionType'
import { DecimalPipe } from '@angular/common'
import { FormBuilder, Validators } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { BigNumber } from 'bignumber.js'

import {
  AirGapDelegateeDetails,
  AirGapDelegationDetails,
  AirGapDelegatorAction,
  AirGapDelegatorDetails
} from '../../interfaces/IAirGapCoinDelegateProtocol'
import { UIAlert } from '../../models/widgets/display/UIAlert'
import { UIIconText } from '../../models/widgets/display/UIIconText'
import { UIInputWidget } from '../../models/widgets/UIInputWidget'
import { UIWidget } from '../../models/widgets/UIWidget'
import { DecimalValidator } from '../../validators/DecimalValidator'

import { V0ProtocolDelegationExtensions } from './base/V0ProtocolDelegationExtensions'

enum ArgumentName {
  COLLATOR = 'collator',
  AMOUNT = 'amount',
  AMOUNT_CONTROL = 'amountControl',
  CANDIDATE = 'candidate',
  MORE = 'more',
  MORE_CONTROL = 'moreControl',
  LESS = 'less',
  LESS_CONTROL = 'lessControl'
}

export class MoonbeamDelegationExtensions extends V0ProtocolDelegationExtensions<MoonbeamProtocol> {
  public static create(
    formBuilder: FormBuilder,
    decimalPipe: DecimalPipe,
    amountConverterPipe: AmountConverterPipe,
    translateService: TranslateService
  ): MoonbeamDelegationExtensions {
    return new MoonbeamDelegationExtensions(formBuilder, decimalPipe, amountConverterPipe, translateService)
  }

  private constructor(
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly translateService: TranslateService
  ) {
    super()
  }

  public delegateeLabel: string = 'delegation-detail-moonbeam.delegatee-label'
  public delegateeLabelPlural: string = 'delegation-detail-moonbeam.delegatee-label-plural'
  public supportsMultipleDelegations: boolean = true

  public airGapDelegatee(_protocol: MoonbeamProtocol): string | undefined {
    return undefined
  }

  public async getExtraDelegationDetailsFromAddress(
    protocol: MoonbeamProtocol,
    _publicKey: string,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const delegationsDetails = await Promise.all(
      delegatees.map((validator) => protocol.getDelegationDetailsFromAddress(delegator, [validator]))
    )

    return Promise.all(
      delegationsDetails.map(async (details) => {
        const [delegator, collator] = await Promise.all([
          this.getExtraDelegatorDetails(protocol, details.delegator, details.delegatees[0].address),
          this.getExtraCollatorDetails(protocol, details.delegatees[0])
        ])

        return {
          delegator: delegator,
          delegatees: [collator],
          alerts: delegator.alerts
        }
      })
    )
  }

  private async getExtraDelegatorDetails(
    protocol: MoonbeamProtocol,
    delegatorDetails: DelegatorDetails,
    collator: string
  ): Promise<AirGapDelegatorDetails & { alerts?: UIAlert[] }> {
    const delegationDetails = await protocol.options.accountController.getDelegationDetails(delegatorDetails.address, collator)

    const results = await Promise.all([
      this.createDelegateAction(protocol, delegationDetails, collator),
      this.createUndelegateAction(protocol, delegationDetails, collator),
      this.createDisplayDetails(protocol, delegationDetails),
      this.createDelegationAlerts(protocol, delegationDetails)
    ])

    const delegateAction = results[0]
    const undelegateAction = results[1]
    const displayDetails = results[2]
    const alerts = results[3]

    const undelegateAllAction = this.createUndelegateAllAction(delegationDetails.delegatorDetails)

    return {
      ...delegatorDetails,
      mainActions: [delegateAction, undelegateAction].filter((action) => !!action),
      secondaryActions: [undelegateAllAction].filter((action) => !!action),
      displayDetails,
      alerts
    }
  }

  private async getExtraCollatorDetails(protocol: MoonbeamProtocol, delegateeDetails: DelegateeDetails): Promise<AirGapDelegateeDetails> {
    const collatorDetails = await protocol.options.accountController.getCollatorDetails(delegateeDetails.address)

    const ownBond = new BigNumber(collatorDetails.ownStakingBalance)
    const totalBond = new BigNumber(collatorDetails.totalStakingBalance)

    const displayDetails = await this.createCollatorDisplayDetails(protocol, collatorDetails)

    return {
      ...delegateeDetails,
      usageDetails: {
        usage: ownBond.div(totalBond),
        current: ownBond,
        total: totalBond
      },
      displayDetails
    }
  }

  private async createCollatorDisplayDetails(_protocol: MoonbeamProtocol, collatorDetails: MoonbeamCollatorDetails): Promise<UIWidget[]> {
    const details: UIWidget[] = []

    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: `${this.decimalPipe.transform(new BigNumber(collatorDetails.commission).times(100).toString())}%`,
        description: 'delegation-detail-moonbeam.commission_label'
      })
    )

    details.push(
      new UIIconText({
        iconName: 'people-outline',
        text: `${collatorDetails.delegators}`,
        description: 'delegation-detail-moonbeam.delegators_label'
      })
    )

    return details
  }

  private async createDelegateAction(
    protocol: MoonbeamProtocol,
    delegationDetails: MoonbeamDelegationDetails,
    collator: string
  ): Promise<AirGapDelegatorAction | null> {
    const { delegatorDetails } = delegationDetails
    const maxDelegationAmount = await protocol
      .estimateMaxDelegationValueFromAddress(delegatorDetails.address)
      .then((value) => new BigNumber(value))
    const minDelegationAmount = new BigNumber(await protocol.getMinDelegationAmount(delegationDetails.delegatorDetails.address))
    const delegatedAmount = new BigNumber(delegationDetails.bond)
    const delegatedFormatted = await this.amountConverterPipe.transform(delegatedAmount, {
      protocol,
      maxDigits: protocol.decimals
    })

    const maxDelegationFormatted = await this.amountConverterPipe.transform(maxDelegationAmount, {
      protocol,
      maxDigits: protocol.decimals
    })

    const hasDelegated = delegatedAmount.gt(0)
    const canDelegate = maxDelegationAmount.gt(minDelegationAmount)

    const baseDescription = hasDelegated
      ? this.translateService.instant('delegation-detail-moonbeam.delegate.has-delegated_text', { delegated: delegatedFormatted })
      : this.translateService.instant('delegation-detail-moonbeam.delegate.not-delegated_text')
    const extraDescription = canDelegate
      ? ` ${this.translateService.instant(
          hasDelegated
            ? 'delegation-detail-moonbeam.delegate.can-delegate-has-delegated_text'
            : 'delegation-detail-moonbeam.delegate.can-delegate-not-delegated_text',
          { maxDelegation: maxDelegationFormatted }
        )}`
      : ''

    return this.createMainDelegatorAction(
      protocol,
      delegatorDetails.availableActions,
      collator,
      [hasDelegated ? MoonbeamStakingActionType.BOND_MORE : MoonbeamStakingActionType.DELEGATE],
      async (_) => 'delegation-detail-moonbeam.delegate.label',
      maxDelegationAmount,
      minDelegationAmount,
      async (_) => baseDescription + extraDescription
    )
  }

  private async createUndelegateAction(
    protocol: MoonbeamProtocol,
    delegationDetails: MoonbeamDelegationDetails,
    collator: string
  ): Promise<AirGapDelegatorAction | null> {
    const { delegatorDetails } = delegationDetails
    const delegatedAmount = new BigNumber(delegationDetails.bond)

    const getLabel = async (action: DelegatorAction) => {
      if (action.type === MoonbeamStakingActionType.SCHEDULE_BOND_LESS || action.type === MoonbeamStakingActionType.SCHEDULE_UNDELEGATE) {
        return 'delegation-detail-moonbeam.undelegate.schedule.label'
      }

      if (action.type === MoonbeamStakingActionType.EXECUTE_BOND_LESS || action.type === MoonbeamStakingActionType.EXECUTE_UNDELEGATE) {
        return 'delegation-detail-moonbeam.undelegate.execute.label'
      }

      if (action.type === MoonbeamStakingActionType.CANCEL_BOND_LESS || action.type === MoonbeamStakingActionType.CANCEL_UNDELEGATE) {
        return 'delegation-detail-moonbeam.undelegate.cancel.label'
      }

      return ''
    }

    const getDescription = async (action: DelegatorAction) => {
      if (action.type === MoonbeamStakingActionType.SCHEDULE_BOND_LESS || action.type === MoonbeamStakingActionType.SCHEDULE_UNDELEGATE) {
        const delegatedAmountFormatted = await this.amountConverterPipe.transform(delegatedAmount, {
          protocol
        })

        return this.translateService.instant('delegation-detail-moonbeam.undelegate.schedule.text', {
          delegated: delegatedAmountFormatted
        })
      }

      if (action.type === MoonbeamStakingActionType.EXECUTE_BOND_LESS || action.type === MoonbeamStakingActionType.EXECUTE_UNDELEGATE) {
        const amountFormatted = delegationDetails.pendingRequest
          ? await this.amountConverterPipe.transform(delegationDetails.pendingRequest.amount, { protocol })
          : undefined

        return this.translateService.instant(
          amountFormatted
            ? 'delegation-detail-moonbeam.undelegate.execute.text'
            : 'delegation-detail-moonbeam.undelegate.execute.text-unknown-request',
          {
            amount: amountFormatted
          }
        )
      }

      if (action.type === MoonbeamStakingActionType.CANCEL_BOND_LESS || action.type === MoonbeamStakingActionType.CANCEL_UNDELEGATE) {
        const amountFormatted = delegationDetails.pendingRequest
          ? await this.amountConverterPipe.transform(delegationDetails.pendingRequest.amount, { protocol })
          : undefined
        const executableIn = delegationDetails.pendingRequest?.executableIn

        return this.translateService.instant(
          amountFormatted !== undefined && executableIn !== undefined
            ? executableIn === 1
              ? 'delegation-detail-moonbeam.undelegate.cancel.text-single-round'
              : 'delegation-detail-moonbeam.undelegate.cancel.text'
            : 'delegation-detail-moonbeam.undelegate.cancel.text-unknown-request',
          {
            amount: amountFormatted,
            executableIn
          }
        )
      }

      return ''
    }

    return this.createMainDelegatorAction(
      protocol,
      delegatorDetails.availableActions,
      collator,
      [
        MoonbeamStakingActionType.EXECUTE_BOND_LESS,
        MoonbeamStakingActionType.EXECUTE_UNDELEGATE,
        MoonbeamStakingActionType.CANCEL_BOND_LESS,
        MoonbeamStakingActionType.CANCEL_UNDELEGATE,
        MoonbeamStakingActionType.SCHEDULE_BOND_LESS,
        MoonbeamStakingActionType.SCHEDULE_UNDELEGATE
      ],
      getLabel,
      delegatedAmount,
      new BigNumber(1),
      getDescription
    )
  }

  private createUndelegateAllAction(delegatorDetails: MoonbeamDelegatorDetails): AirGapDelegatorAction | null {
    if (delegatorDetails.availableActions?.find((action) => action.type === MoonbeamStakingActionType.SCHEDULE_UNDELEGATE_ALL)) {
      return {
        type: MoonbeamStakingActionType.SCHEDULE_UNDELEGATE_ALL,
        label: 'delegation-detail-moonbeam.undelegate-all.schedule.label',
        iconName: 'close-outline'
      }
    }

    if (delegatorDetails.availableActions?.find((action) => action.type === MoonbeamStakingActionType.EXECUTE_UNDELEGATE_ALL)) {
      return {
        type: MoonbeamStakingActionType.EXECUTE_UNDELEGATE_ALL,
        label: 'delegation-detail-moonbeam.undelegate-all.execute.label',
        iconName: 'close-outline'
      }
    }

    if (delegatorDetails.availableActions?.find((action) => action.type === MoonbeamStakingActionType.CANCEL_UNDELEGATE_ALL)) {
      return {
        type: MoonbeamStakingActionType.CANCEL_UNDELEGATE_ALL,
        label: 'delegation-detail-moonbeam.undelegate-all.cancel.label',
        iconName: 'close-outline'
      }
    }

    return null
  }

  private async createMainDelegatorAction(
    protocol: MoonbeamProtocol,
    availableActions: DelegatorAction[],
    collator: string,
    types: MoonbeamStakingActionType[],
    getLabel: (action: DelegatorAction) => Promise<string>,
    maxAmount: BigNumber,
    minAmount: BigNumber,
    getDescription: (action: DelegatorAction) => Promise<string>
  ): Promise<AirGapDelegatorAction | null> {
    const action = availableActions.find((action) => types.includes(action.type))

    if (action && maxAmount.gte(minAmount)) {
      const maxAmountFormatted = maxAmount.shiftedBy(-protocol.decimals).decimalPlaces(protocol.decimals).toFixed()

      const minAmountFormatted = minAmount.shiftedBy(-protocol.decimals).decimalPlaces(protocol.decimals).toFixed()

      const { address: collatorArgName, amount: amountArgName, amountControl: amountControlArgName } = this.resolveMainArgumentNames(
        action.type
      )

      let controls = {
        [collatorArgName]: collator
      }
      const inputWidgets: UIInputWidget<any>[] = []

      if (amountArgName && amountControlArgName) {
        controls = Object.assign(controls, {
          [amountArgName]: maxAmount.toFixed(),
          [amountControlArgName]: [
            maxAmountFormatted,
            Validators.compose([
              Validators.required,
              Validators.min(new BigNumber(minAmountFormatted).toNumber()),
              Validators.max(new BigNumber(maxAmountFormatted).toNumber()),
              DecimalValidator.validate(protocol.decimals)
            ])
          ]
        })
        inputWidgets.push(
          this.createAmountWidget(amountControlArgName, maxAmountFormatted, minAmountFormatted, {
            onValueChanged: (value: string) => {
              form.patchValue({ [amountArgName]: new BigNumber(value).shiftedBy(protocol.decimals).toFixed() })
            }
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

    return null
  }

  private resolveMainArgumentNames(mainAction: MoonbeamStakingActionType): { address: string; amount?: string; amountControl?: string } {
    switch (mainAction) {
      case MoonbeamStakingActionType.DELEGATE:
        return {
          address: ArgumentName.CANDIDATE,
          amount: ArgumentName.AMOUNT,
          amountControl: ArgumentName.AMOUNT_CONTROL
        }
      case MoonbeamStakingActionType.BOND_MORE:
        return {
          address: ArgumentName.CANDIDATE,
          amount: ArgumentName.MORE,
          amountControl: ArgumentName.MORE_CONTROL
        }
      case MoonbeamStakingActionType.SCHEDULE_UNDELEGATE:
        return {
          address: ArgumentName.COLLATOR
        }
      case MoonbeamStakingActionType.EXECUTE_UNDELEGATE:
        return {
          address: ArgumentName.CANDIDATE
        }
      case MoonbeamStakingActionType.CANCEL_UNDELEGATE:
        return {
          address: ArgumentName.CANDIDATE
        }
      case MoonbeamStakingActionType.SCHEDULE_BOND_LESS:
        return {
          address: ArgumentName.CANDIDATE,
          amount: ArgumentName.LESS,
          amountControl: ArgumentName.LESS_CONTROL
        }
      case MoonbeamStakingActionType.EXECUTE_BOND_LESS:
        return {
          address: ArgumentName.CANDIDATE
        }
      case MoonbeamStakingActionType.CANCEL_BOND_LESS:
        return {
          address: ArgumentName.CANDIDATE
        }
      default:
        return {
          address: ArgumentName.COLLATOR,
          amount: ArgumentName.AMOUNT,
          amountControl: ArgumentName.AMOUNT_CONTROL
        }
    }
  }

  private async createDisplayDetails(protocol: MoonbeamProtocol, delegationDetails: MoonbeamDelegationDetails): Promise<UIWidget[]> {
    const details = []
    const bond = new BigNumber(delegationDetails.bond)

    const maxDelegations = await protocol.options.nodeClient.getMaxDelegationsPerDelegator()

    if (delegationDetails.delegatorDetails.status) {
      details.push(
        new UIIconText({
          iconName: 'information-outline',
          text: this.getStatusDescription(delegationDetails.delegatorDetails),
          description: 'delegation-detail-moonbeam.delegator-status.label'
        })
      )
    }

    if (bond.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'logo-usd',
          text: await this.amountConverterPipe.transform(bond, {
            protocol
          }),
          description: 'delegation-detail-moonbeam.currently-delegated_label'
        })
      )
    }

    if (maxDelegations) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: `${delegationDetails.delegatorDetails.delegatees.length}/${maxDelegations.toString()}`,
          description: 'delegation-detail-moonbeam.collators_label'
        })
      )
    }

    return details
  }

  private async createDelegationAlerts(protocol: MoonbeamProtocol, delegationDetails: MoonbeamDelegationDetails): Promise<UIAlert[]> {
    const alerts: UIAlert[] = []

    const maxTopDelegations = await protocol.options.nodeClient.getMaxTopDelegationsPerCandidate()

    if (
      maxTopDelegations &&
      maxTopDelegations.lt(delegationDetails.collatorDetails.delegators) &&
      new BigNumber(delegationDetails.bond).lte(delegationDetails.collatorDetails.minEligibleBalance)
    ) {
      alerts.push(
        new UIAlert({
          title: 'delegation-detail-moonbeam.alert.collator-oversubscribed.title',
          description: this.translateService.instant('delegation-detail-moonbeam.alert.collator-oversubscribed.description', {
            maxTopDelegations: maxTopDelegations.toString(),
            minStakingAmount: await this.amountConverterPipe.transform(delegationDetails.collatorDetails.minEligibleBalance, {
              protocol,
              maxDigits: protocol.decimals
            })
          }),
          icon: 'alert-circle-outline',
          color: 'warning'
        })
      )
    }

    return alerts
  }

  private getStatusDescription(delegatorDetails: MoonbeamDelegatorDetails): string {
    switch (delegatorDetails.status) {
      case 'Active':
        return 'delegation-detail-moonbeam.delegator-status.active_label'
      case 'Leaving':
        return 'delegation-detail-moonbeam.delegator-status.leaving_label'
      case 'ReadyToLeave':
        return 'delegation-detail-moonbeam.delegator-status.ready-to-leave_label'
      default:
        return 'delegation-detail-moonbeam.delegator-status.unknown_label'
    }
  }
}
