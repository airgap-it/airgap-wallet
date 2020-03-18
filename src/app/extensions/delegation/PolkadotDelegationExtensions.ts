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
import { UIWidget } from 'src/app/models/widgets/UIWidget'
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
            new UIIconText('commission', 'logo-usd', validatorDetails.commission + '%' || '-', 'Comission')
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
    const delegateAction = PolkadotDelegationExtensions.createDelegateAction(availableActions)
    const undelegateAction = PolkadotDelegationExtensions.createUndelegateAction(availableActions)
    const extraActions = PolkadotDelegationExtensions.createExtraActions(availableActions)

    return {
      delegateAction,
      undelegateAction,
      extraActions
    }
  }

  private static createDelegateAction(availableActions: DelegatorAction[]): AirGapMainDelegatorAction {
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
            ? [
                new UIInputText('value', 'Amount', '0'),
                new UISelect(
                  'payee',
                  'Reward destination',
                  [
                    [PolkadotRewardDestination.Staked, 'Staked'], // probably needs better labels
                    [PolkadotRewardDestination.Stash, 'Stash'],
                    [PolkadotRewardDestination.Controller, 'Controller']
                  ],
                  PolkadotRewardDestination.Staked
                )
              ]
            : []),
          new UIInputText('tip', 'Tip', '0')
        ]
      }
    }

    return {
      description: "Can't delegate",
      isAvailable: false
    }
  }

  private static createUndelegateAction(availableActions: DelegatorAction[]): AirGapMainDelegatorAction {
    const action = availableActions.find(action => action.type === PolkadotStakingActionType.CANCEL_NOMINATION)

    if (action) {
      return {
        type: action.type,
        isAvailable: true,
        description: 'Undelegate description',
        extraArgs: [new UICheckbox('keepController', 'Keep Controller', true), new UIInputText('value', 'Amount', '0')]
      }
    }

    return {
      description: "Can't undelegate",
      isAvailable: false
    }
  }

  private static createExtraActions(availableActions: DelegatorAction[]): AirGapExtraDelegatorAction[] {
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
        let args: UIWidget[]

        switch (action.type) {
          case PolkadotStakingActionType.UNBOND:
            label = 'Unbond'
            confirmLabel = 'Unbond'
            description = 'Unbond description'
            args = [new UIInputText('value', 'Amount', '0')]
            break
          case PolkadotStakingActionType.BOND_EXTRA:
            label = 'Bond Extra'
            confirmLabel = 'Bond'
            description = 'Bond extra description'
            args = [new UIInputText('value', 'Amount', '0')]
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
            args = [
              new UISelect(
                'payee',
                'Reward destination',
                [
                  [PolkadotRewardDestination.Staked, 'Staked'], // probably needs better labels
                  [PolkadotRewardDestination.Stash, 'Stash'],
                  [PolkadotRewardDestination.Controller, 'Controller']
                ],
                PolkadotRewardDestination.Staked
              )
            ]
            break
          case PolkadotStakingActionType.CHANGE_CONTROLLER:
            label = 'Change Controller'
            confirmLabel = 'Change'
            description = 'Change controller description'
            args = [new UIInputText('controller', 'Controller')]
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
}
