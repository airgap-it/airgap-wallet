import { AmountConverterPipe } from '@airgap/angular-core'
import { DelegateeDetails, DelegatorAction, DelegatorDetails, MoonbeamProtocol } from '@airgap/coinlib-core'
import { MoonbeamCollatorDetails } from '@airgap/coinlib-core/protocols/substrate/moonbeam/data/staking/MoonbeamCollatorDetails'
import { MoonbeamNominationDetails } from '@airgap/coinlib-core/protocols/substrate/moonbeam/data/staking/MoonbeamNominationDetails'
import { MoonbeamNominatorDetails } from '@airgap/coinlib-core/protocols/substrate/moonbeam/data/staking/MoonbeamNominatorDetails'
import { MoonbeamStakingActionType } from '@airgap/coinlib-core/protocols/substrate/moonbeam/data/staking/MoonbeamStakingActionType'
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
import { UIIconText } from '../../models/widgets/display/UIIconText'
import { UIInputWidget } from '../../models/widgets/UIInputWidget'
import { UIWidget } from '../../models/widgets/UIWidget'
import { DecimalValidator } from '../../validators/DecimalValidator'

import { ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'

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

export class MoonbeamDelegationExtensions extends ProtocolDelegationExtensions<MoonbeamProtocol> {
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
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]> {
    const delegationsDetails = await Promise.all(
      delegatees.map((validator) => protocol.getDelegationDetailsFromAddress(delegator, [validator]))
    )

    return Promise.all(
      delegationsDetails.map(async (details) => {
        const [delegator, validator] = await Promise.all([
          this.getExtraNominatorDetails(protocol, details.delegator, details.delegatees[0].address),
          this.getExtraCollatorDetails(protocol, details.delegatees[0])
        ])

        return {
          delegator,
          delegatees: [validator]
        }
      })
    )
  }

  private async getExtraNominatorDetails(
    protocol: MoonbeamProtocol,
    delegatorDetails: DelegatorDetails,
    collator: string
  ): Promise<AirGapDelegatorDetails> {
    const nominationDetails = await protocol.options.accountController.getNominationDetails(delegatorDetails.address, collator)

    const delegateAction = await this.createDelegateAction(protocol, nominationDetails, collator)
    const undelegateAction = await this.createUndelegateAction(protocol, nominationDetails, collator)
    const undelegateAllAction = this.createUndelegateAllAction(nominationDetails.nominatorDetails)

    const displayDetails = await this.createDisplayDetails(protocol, nominationDetails)

    return {
      ...delegatorDetails,
      mainActions: [delegateAction, undelegateAction].filter((action) => !!action),
      secondaryActions: [undelegateAllAction].filter((action) => !!action),
      displayDetails
    }
  }

  private async getExtraCollatorDetails(protocol: MoonbeamProtocol, delegateeDetails: DelegateeDetails): Promise<AirGapDelegateeDetails> {
    const collatorDetails = await protocol.options.accountController.getCollatorDetails(delegateeDetails.address)

    const ownBond = new BigNumber(collatorDetails.ownStakingBalance)
    const totalBond = new BigNumber(collatorDetails.totalStakingBalance)

    const displayDetails = await this.createValidatorDisplayDetails(protocol, collatorDetails)

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

  private async createValidatorDisplayDetails(protocol: MoonbeamProtocol, collatorDetails: MoonbeamCollatorDetails): Promise<UIWidget[]> {
    const details = []

    const maxNominators = await protocol.options.nodeClient.getMaxNominatorsPerCollator()

    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: `${this.decimalPipe.transform(new BigNumber(collatorDetails.commission).times(100).toString())}%`,
        description: 'delegation-detail-moonbeam.commission_label'
      })
    )

    if (maxNominators) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: `${collatorDetails.nominators}/${maxNominators.toString()}`,
          description: 'delegation-detail-moonbeam.nominators_label'
        })
      )
    }

    return details
  }

  private async createDelegateAction(
    protocol: MoonbeamProtocol,
    nominationDetails: MoonbeamNominationDetails,
    collator: string
  ): Promise<AirGapDelegatorAction | null> {
    this.translateService
    this.createMainDelegatorAction
    const { nominatorDetails } = nominationDetails
    const maxDelegationAmount = await protocol
      .estimateMaxDelegationValueFromAddress(nominatorDetails.address)
      .then((value) => new BigNumber(value))
    const minDelegationAmount = new BigNumber(await protocol.getMinDelegationAmount(nominationDetails.nominatorDetails.address))
    const delegatedAmount = new BigNumber(nominationDetails.bond)
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
      nominatorDetails.availableActions,
      collator,
      [hasDelegated ? MoonbeamStakingActionType.BOND_MORE : MoonbeamStakingActionType.NOMINATE],
      'delegation-detail-moonbeam.delegate.label',
      maxDelegationAmount,
      minDelegationAmount,
      baseDescription + extraDescription
    )
  }

  private async createUndelegateAction(
    protocol: MoonbeamProtocol,
    nominationDetails: MoonbeamNominationDetails,
    collator: string
  ): Promise<AirGapDelegatorAction | null> {
    const { nominatorDetails } = nominationDetails
    const delegatedAmount = new BigNumber(nominationDetails.bond)
    const delegatedAmountFormatted = await this.amountConverterPipe.transform(delegatedAmount, {
      protocol
    })
    const description = this.translateService.instant('delegation-detail-moonbeam.undelegate.text', { delegated: delegatedAmountFormatted })

    return this.createMainDelegatorAction(
      protocol,
      nominatorDetails.availableActions,
      collator,
      [MoonbeamStakingActionType.BOND_LESS, MoonbeamStakingActionType.CANCEL_NOMINATION],
      'delegation-detail-moonbeam.undelegate.label',
      delegatedAmount,
      new BigNumber(1),
      description
    )
  }

  private createUndelegateAllAction(nominatorDetails: MoonbeamNominatorDetails): AirGapDelegatorAction | null {
    const isNominating = nominatorDetails.delegatees.length > 0

    return isNominating
      ? {
          type: MoonbeamStakingActionType.CANCEL_ALL_NOMINATIONS,
          label: 'delegation-detail-moonbeam.undelegate-all.label',
          iconName: 'close-outline'
        }
      : null
  }

  private createMainDelegatorAction(
    protocol: MoonbeamProtocol,
    availableActions: DelegatorAction[],
    collator: string,
    types: MoonbeamStakingActionType[],
    label: string,
    maxAmount: BigNumber,
    minAmount: BigNumber,
    description: string
  ): AirGapDelegatorAction | null {
    const action = availableActions.find((action) => types.includes(action.type))

    if (action && maxAmount.gte(minAmount)) {
      const maxAmountFormatted = this.amountConverterPipe.formatBigNumber(
        maxAmount.shiftedBy(-protocol.decimals).decimalPlaces(protocol.decimals),
        protocol.decimals
      )

      const minAmountFormatted = this.amountConverterPipe.formatBigNumber(
        minAmount.shiftedBy(-protocol.decimals).decimalPlaces(protocol.decimals),
        protocol.decimals
      )

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
      case MoonbeamStakingActionType.NOMINATE:
        return {
          address: ArgumentName.COLLATOR,
          amount: ArgumentName.AMOUNT,
          amountControl: ArgumentName.AMOUNT_CONTROL
        }
      case MoonbeamStakingActionType.BOND_MORE:
        return {
          address: ArgumentName.CANDIDATE,
          amount: ArgumentName.MORE,
          amountControl: ArgumentName.MORE_CONTROL
        }
      case MoonbeamStakingActionType.CANCEL_NOMINATION:
        return {
          address: ArgumentName.COLLATOR
        }
      case MoonbeamStakingActionType.BOND_LESS:
        return {
          address: ArgumentName.CANDIDATE,
          amount: ArgumentName.LESS,
          amountControl: ArgumentName.LESS_CONTROL
        }
      default:
        return {
          address: ArgumentName.COLLATOR,
          amount: ArgumentName.AMOUNT,
          amountControl: ArgumentName.AMOUNT_CONTROL
        }
    }
  }

  private async createDisplayDetails(protocol: MoonbeamProtocol, nominationDetails: MoonbeamNominationDetails): Promise<UIWidget[]> {
    const details = []
    const bond = new BigNumber(nominationDetails.bond)

    const maxCollators = await protocol.options.nodeClient.getMaxCollatorsPerNominator()

    if (nominationDetails.nominatorDetails.status) {
      details.push(
        new UIIconText({
          iconName: 'information-outline',
          text: this.getStatusDescription(nominationDetails.nominatorDetails),
          description: 'delegation-detail-moonbeam.nominator-status.label'
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

    if (maxCollators) {
      details.push(
        new UIIconText({
          iconName: 'people-outline',
          text: `${nominationDetails.nominatorDetails.delegatees.length}/${maxCollators.toString()}`,
          description: 'delegation-detail-moonbeam.collators_label'
        })
      )
    }

    return details
  }

  private getStatusDescription(nominatorDetails: MoonbeamNominatorDetails): string {
    switch (nominatorDetails.status) {
      case 'Active':
        return 'delegation-detail-moonbeam.nominator-status.active_label'
      case 'Leaving':
        return 'delegation-detail-moonbeam.nominator-status.leaving_label'
      default:
        return 'delegation-detail-moonbeam.nominator-status.unknown_label'
    }
  }
}
