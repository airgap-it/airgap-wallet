import { PolkadotProtocol, AirGapMarketWallet, PolkadotRewardDestination } from 'airgap-coin-lib'
import {
  AirGapDelegateeDetails,
  AirGapDelegatorDetails,
  AirGapMainDelegatorAction,
  AirGapExtraDelegatorAction
} from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { PolkadotAddress } from 'airgap-coin-lib/dist/protocols/polkadot/account/PolkadotAddress'
import BigNumber from 'bignumber.js'
import { UIIconText } from 'src/app/models/widgets/UIIconText'
import { UIInputWidget, UIWidget } from 'src/app/models/widgets/UIWidget'
import { PolkadotStakingActionType } from 'airgap-coin-lib/dist/protocols/polkadot/staking/PolkadotStakingActionType'
import { UIInputText, UIInputTextConfig } from 'src/app/models/widgets/UIInputText'
import { DelegatorAction } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { PolkadotStakingInfo } from 'airgap-coin-lib/dist/protocols/polkadot/staking/PolkadotStakingLedger'
import { UISelect, UISelectConfig } from 'src/app/models/widgets/UISelect'
import * as moment from 'moment'

export class PolkadotDelegationExtensionFunctionsProvider {
  private readonly supportedActions = [
    PolkadotStakingActionType.BOND_NOMINATE,
    PolkadotStakingActionType.BOND_EXTRA,
    PolkadotStakingActionType.CANCEL_NOMINATION,
    PolkadotStakingActionType.CHANGE_NOMINATION,
    PolkadotStakingActionType.WITHDRAW_UNBONDED
  ]

  public async getExtraDelegateesDetails(protocol: PolkadotProtocol, addresses: string[]): Promise<Partial<AirGapDelegateeDetails>[]> {
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
              text: validatorDetails.commission ? validatorDetails.commission + '%' : '-',
              description: 'Comission'
            })
          ]
        }
      })
    )
  }

  public async getExtraDelegatorDetailsFromAddress(protocol: PolkadotProtocol, address: string): Promise<Partial<AirGapDelegatorDetails>> {
    const polkadotAddress = PolkadotAddress.fromEncoded(address)

    const results = await Promise.all([
      protocol.accountController.getAvailableDelegatorActions(polkadotAddress.getHexPublicKey()),
      this.createExtraDetails(protocol, polkadotAddress)
    ])

    const availableActions = results[0].filter(action => this.supportedActions.includes(action.type))
    const extraDetails = results[1]

    // TODO: add translations
    const actionResults = await Promise.all([
      this.createDelegateAction(protocol, polkadotAddress, availableActions),
      this.createUndelegateAction(protocol, polkadotAddress, availableActions),
      this.createChangeDelegateeAction(availableActions),
      this.createExtraActions(availableActions)
    ])

    const delegateAction = actionResults[0]
    const undelegateAction = actionResults[1]
    const changeDelegateeAction = actionResults[2]
    const extraActions = actionResults[3]

    return {
      delegateAction,
      undelegateAction,
      changeDelegateeAction,
      extraActions,
      extraDetails
    }
  }

  private async createDelegateAction(
    protocol: PolkadotProtocol,
    address: PolkadotAddress,
    availableActions: DelegatorAction[]
  ): Promise<AirGapMainDelegatorAction> {
    const action = availableActions.find(
      action => action.type === PolkadotStakingActionType.BOND_NOMINATE || action.type === PolkadotStakingActionType.BOND_EXTRA
    )

    if (action) {
      const maxValue = await protocol.accountController.calculateMaxDelegationValue(address)

      return {
        type: action.type,
        isAvailable: true,
        description: 'Delegate description',
        paramName: 'targets',
        extraArgs: [
          this.createValueWidget(protocol.decimals, {
            defaultValue: maxValue.shiftedBy(-protocol.decimals).toFixed(2),
            toggleFixedValueButton: 'Max',
            fixedValue: maxValue.shiftedBy(-protocol.decimals).toFixed(2)
          }),
          ...(action.type === PolkadotStakingActionType.BOND_NOMINATE ? [this.createPayeeWidget({ isVisible: false })] : []),
          this.createTipWidget(protocol.decimals)
        ]
      }
    }

    return {
      description: "Can't delegate",
      isAvailable: false
    }
  }

  private async createUndelegateAction(
    protocol: PolkadotProtocol,
    address: PolkadotAddress,
    availableActions: DelegatorAction[]
  ): Promise<AirGapMainDelegatorAction> {
    const action = availableActions.find(action => action.type === PolkadotStakingActionType.CANCEL_NOMINATION)

    if (action) {
      const stakingInfo = await protocol.accountController.getStakingInfo(address)

      if (stakingInfo) {
        return {
          type: action.type,
          isAvailable: true,
          description: 'Undelegate description',
          extraArgs: [
            this.createValueWidget(protocol.decimals, {
              isVisible: false,
              toggleFixedValueButton: 'Max',
              fixedValue: stakingInfo.active.shiftedBy(-protocol.decimals).toFixed(2),
              defaultValue: stakingInfo.active.shiftedBy(-protocol.decimals).toFixed(2)
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
        paramName: 'targets'
      }
    }

    return {
      description,
      isAvailable: true
    }
  }

  private createExtraActions(availableActions: DelegatorAction[]): AirGapExtraDelegatorAction[] {
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

  private createValueWidget(decimals: number, config: Partial<UIInputTextConfig> = {}): UIInputText {
    return new UIInputText({
      id: 'value',
      inputType: 'number',
      label: 'Amount',
      placeholder: '0.0',
      defaultValue: '0.0',
      createExtraLabel: (value: string, wallet?: AirGapMarketWallet) =>
        wallet ? `$${new BigNumber(value || 0).multipliedBy(wallet.currentMarketPrice).toFixed(2)}` : '',
      customizeInput: (value: string) => new BigNumber(value).shiftedBy(decimals).toString(),
      ...config
    })
  }

  private createTipWidget(decimals: number, config: Partial<UIInputTextConfig> = {}): UIInputText {
    return new UIInputText({
      id: 'tip',
      inputType: 'number',
      label: 'Tip',
      placeholder: '0.0',
      defaultValue: '0.0',
      createExtraLabel: (value: string, wallet?: AirGapMarketWallet) =>
        wallet ? `$${new BigNumber(value || 0).multipliedBy(wallet.currentMarketPrice).toFixed(2)}` : '',
      customizeInput: (value: string) => new BigNumber(value).shiftedBy(decimals).toString(),
      ...config
    })
  }

  private createPayeeWidget(config: Partial<UISelectConfig> = {}): UISelect {
    return new UISelect({
      id: 'payee',
      label: 'Reward destination',
      options: [
        [PolkadotRewardDestination.Staked, 'Staked'], // probably needs better labels
        [PolkadotRewardDestination.Stash, 'Stash'],
        [PolkadotRewardDestination.Controller, 'Controller']
      ],
      defaultOption: PolkadotRewardDestination.Staked,
      ...config
    })
  }

  private async createExtraDetails(protocol: PolkadotProtocol, address: PolkadotAddress): Promise<UIWidget[]> {
    const extraDetails = []

    const results = await Promise.all([
      protocol.accountController.isNominating(address),
      protocol.accountController.getStakingInfo(address)
    ])
    const isNominating = results[0]
    const stakingInfo = results[1]

    if (stakingInfo) {
      extraDetails.push(...(await this.createStakingDetailsWidgets(protocol, isNominating, stakingInfo)))
    }

    return extraDetails
  }

  private async createStakingDetailsWidgets(
    protocol: PolkadotProtocol,
    isNominating: boolean,
    stakingInfo: PolkadotStakingInfo
  ): Promise<UIWidget[]> {
    const details = []

    if (stakingInfo.total.eq(stakingInfo.active)) {
      details.push(
        new UIIconText({
          iconName: 'contacts',
          text: `${stakingInfo.total.shiftedBy(-protocol.decimals).toString()} ${protocol.marketSymbol}`,
          description: isNominating ? 'Delegated' : 'Bonded'
        })
      )
    } else if (stakingInfo.locked.length > 0) {
      const nextUnlocking = stakingInfo.locked.sort((a, b) => a.expectedUnlock.minus(b.expectedUnlock))[0]
      const unlockingDate = new Date(nextUnlocking.expectedUnlock.toNumber())
      details.push(
        new UIIconText({
          iconName: 'contacts',
          text: `${nextUnlocking.value.shiftedBy(-protocol.decimals).toString()} ${protocol.marketSymbol}`,
          description: 'Locked'
        }),
        new UIIconText({
          iconName: 'alarm',
          text: `${moment(unlockingDate).fromNow()} (${moment(unlockingDate).format('LLL')})`,
          description: 'Ready to withdraw'
        })
      )
    } else if (stakingInfo.unlocked.gt(0)) {
      details.push(
        new UIIconText({
          iconName: 'contacts',
          text: `${stakingInfo.unlocked.shiftedBy(-protocol.decimals).toString()} ${protocol.marketSymbol}`,
          description: 'Ready to withdraw'
        })
      )
    }

    return details
  }
}
