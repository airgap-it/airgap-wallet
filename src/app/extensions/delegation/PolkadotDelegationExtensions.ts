import { PolkadotProtocol, PolkadotRewardDestination } from 'airgap-coin-lib'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapMainDelegatorAction,
  AirGapExtraDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { extensionProperty, extensionFunction } from '../decorators'
import { PolkadotAddress } from 'airgap-coin-lib/dist/protocols/polkadot/account/PolkadotAddress'
import BigNumber from 'bignumber.js'
import { UIIconText } from 'src/app/models/widgets/UIIconText'
import { UIInputWidget } from 'src/app/models/widgets/UIWidget'
import { PolkadotStakingActionType } from 'airgap-coin-lib/dist/protocols/polkadot/staking/PolkadotStakingActionType'
import { UIInputText } from 'src/app/models/widgets/UIInputText'
import { UISelect } from 'src/app/models/widgets/UISelect'
import { DelegatorAction } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { UICheckbox } from 'src/app/models/widgets/UICheckbox'

export class PolkadotDelegationExtensions {
  @extensionProperty(PolkadotProtocol)
  static delegateeLabel: string = 'Validator'

  @extensionFunction(PolkadotProtocol)
  static async getExtraDelegateesDetails(protocol: PolkadotProtocol, addresses: string[]): Promise<Partial<AirGapDelegateeDetails>[]> {
    return Promise.all(
      addresses.map(async address => {
        const validatorDetails = await protocol.nodeClient.getValidatorDetails(PolkadotAddress.fromEncoded(address))

        const ownStash = validatorDetails.ownStash ? validatorDetails.ownStash : new BigNumber(0)
        const totalStakingBalance = validatorDetails.totalStakingBalance ? validatorDetails.totalStakingBalance : new BigNumber(0)

        return {
          status: validatorDetails.status || 'unknown',
          usageDetails: {
            usage: ownStash.dividedBy(totalStakingBalance),
            current: ownStash,
            total: totalStakingBalance
          },
          extraDetails: [
            // TODO: Add translations
            new UIIconText({
              iconName: 'logo-usd',
              text: validatorDetails.commission + '%' || '-',
              description: 'Comission'
            })
          ]
        }
      })
    )
  }

  @extensionFunction(PolkadotProtocol)
  static async getExtraDelegatorDetailsFromAddress(protocol: PolkadotProtocol, address: string): Promise<Partial<AirGapDelegatorDetails>> {
    const publicKey = PolkadotAddress.fromEncoded(address).getHexPublicKey()
    const availableActions = await protocol.accountController.getAvailableDelegatorActions(publicKey)

    // TODO: add translations
    const delegateAction = PolkadotDelegationExtensions.createDelegateAction(protocol, availableActions)
    const undelegateAction = PolkadotDelegationExtensions.createUndelegateAction(protocol, availableActions)
    const extraActions = PolkadotDelegationExtensions.createExtraActions(protocol, availableActions)

    return {
      delegateAction,
      undelegateAction,
      extraActions
    }
  }

  private static createDelegateAction(protocol: PolkadotProtocol, availableActions: DelegatorAction[]): AirGapMainDelegatorAction {
    const action = availableActions.find(
      action => action.type === PolkadotStakingActionType.BOND_NOMINATE || action.type === PolkadotStakingActionType.NOMINATE
    )

    if (action) {
      return {
        type: action.type,
        isAvailable: true,
        description: 'Delegate description',
        paramName: 'targets',
        extraArgs: [
          ...(action.type === PolkadotStakingActionType.BOND_NOMINATE
            ? [PolkadotDelegationExtensions.createValueWidget(protocol.decimals), PolkadotDelegationExtensions.createPayeeWidget()]
            : []),
          PolkadotDelegationExtensions.createTipWidget(protocol.decimals)
        ]
      }
    }

    return {
      description: "Can't delegate",
      isAvailable: false
    }
  }

  private static createUndelegateAction(protocol: PolkadotProtocol, availableActions: DelegatorAction[]): AirGapMainDelegatorAction {
    const action = availableActions.find(action => action.type === PolkadotStakingActionType.CANCEL_NOMINATION)

    if (action) {
      return {
        type: action.type,
        isAvailable: true,
        description: 'Undelegate description',
        extraArgs: [
          PolkadotDelegationExtensions.createKeepControllerWidget(),
          PolkadotDelegationExtensions.createValueWidget(protocol.decimals)
        ]
      }
    }

    return {
      description: "Can't undelegate",
      isAvailable: false
    }
  }

  private static createExtraActions(protocol: PolkadotProtocol, availableActions: DelegatorAction[]): AirGapExtraDelegatorAction[] {
    return availableActions
      .filter(
        action =>
          action.type !== PolkadotStakingActionType.BOND_NOMINATE &&
          action.type !== PolkadotStakingActionType.NOMINATE &&
          action.type !== PolkadotStakingActionType.CANCEL_NOMINATION
      )
      .map(action => {
        let label: string
        let confirmLabel: string
        let description: string
        let args: UIInputWidget<any>[]

        switch (action.type) {
          case PolkadotStakingActionType.UNBOND:
            label = 'Unbond'
            confirmLabel = 'Unbond'
            description = 'Unbond description'
            args = [PolkadotDelegationExtensions.createValueWidget(protocol.decimals)]
            break
          case PolkadotStakingActionType.BOND_EXTRA:
            label = 'Bond Extra'
            confirmLabel = 'Bond'
            description = 'Bond extra description'
            args = [PolkadotDelegationExtensions.createValueWidget(protocol.decimals)]
            break
          case PolkadotStakingActionType.WITHDRAW_UNBONDED:
            label = 'Withdraw Unbonded'
            confirmLabel = 'Withdraw'
            description = 'Withdraw unbonded description'
            break
          case PolkadotStakingActionType.CHANGE_REWARD_DESTINATION:
            label = 'Change Reward Destination'
            confirmLabel = 'Change'
            description = 'Change reward destination description'
            args = [PolkadotDelegationExtensions.createPayeeWidget()]
            break
          case PolkadotStakingActionType.CHANGE_CONTROLLER:
            label = 'Change Controller'
            confirmLabel = 'Change'
            description = 'Change controller description'
            args = [PolkadotDelegationExtensions.createControllerWidget()]
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

  private static createValueWidget(decimals: number): UIInputText {
    return new UIInputText({
      id: 'value',
      inputType: 'number',
      label: 'Amount',
      placeholder: '0.0',
      defaultValue: '0.0',
      customizeInput: (value: string) => new BigNumber(value).shiftedBy(decimals).toString()
    })
  }

  private static createTipWidget(decimals: number): UIInputText {
    return new UIInputText({
      id: 'tip',
      inputType: 'number',
      label: 'Tip',
      placeholder: '0.0',
      defaultValue: '0.0',
      customizeInput: (value: string) => new BigNumber(value).shiftedBy(decimals).toString()
    })
  }

  private static createPayeeWidget(defaultOption?: PolkadotRewardDestination): UISelect {
    return new UISelect({
      id: 'payee',
      label: 'Reward destination',
      options: [
        [PolkadotRewardDestination.Staked, 'Staked'], // probably needs better labels
        [PolkadotRewardDestination.Stash, 'Stash'],
        [PolkadotRewardDestination.Controller, 'Controller']
      ],
      defaultOption: defaultOption || PolkadotRewardDestination.Staked
    })
  }

  private static createKeepControllerWidget(): UICheckbox {
    return new UICheckbox({
      id: 'keepController',
      label: 'Keep Controller',
      defaultValue: true
    })
  }

  private static createControllerWidget(): UIInputText {
    return new UIInputText({
      id: 'controller',
      inputType: 'string',
      label: 'Controller'
    })
  }
}
