import { PolkadotProtocol, PolkadotRewardDestination, AirGapMarketWallet } from 'airgap-coin-lib'
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
import { UIInputText } from 'src/app/models/widgets/UIInputText'
import { UISelect } from 'src/app/models/widgets/UISelect'
import { DelegatorAction } from 'airgap-coin-lib/dist/protocols/ICoinDelegateProtocol'
import { UICheckbox } from 'src/app/models/widgets/UICheckbox'
import { UIAccount } from 'src/app/models/widgets/UIAccount'
import { PolkadotStakingLedger } from 'airgap-coin-lib/dist/protocols/polkadot/staking/PolkadotStakingLedger'

export class PolkadotDelegationExtensionFunctionsProvider {
  constructor(private readonly wallet: AirGapMarketWallet) {}

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

    const availableActions = results[0]
    const extraDetails = results[1]

    // TODO: add translations
    const delegateAction = this.createDelegateAction(protocol, availableActions)
    const undelegateAction = this.createUndelegateAction(protocol, availableActions)
    const extraActions = this.createExtraActions(protocol, availableActions)

    return {
      delegateAction,
      undelegateAction,
      extraActions,
      extraDetails
    }
  }

  private createDelegateAction(protocol: PolkadotProtocol, availableActions: DelegatorAction[]): AirGapMainDelegatorAction {
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
            ? [this.createValueWidget(protocol.decimals), this.createPayeeWidget()]
            : []),
          this.createTipWidget(protocol.decimals)
        ]
      }
    }

    return {
      description: "Can't delegate",
      isAvailable: false
    }
  }

  private createUndelegateAction(protocol: PolkadotProtocol, availableActions: DelegatorAction[]): AirGapMainDelegatorAction {
    const action = availableActions.find(action => action.type === PolkadotStakingActionType.CANCEL_NOMINATION)

    if (action) {
      return {
        type: action.type,
        isAvailable: true,
        description: 'Undelegate description',
        extraArgs: [this.createKeepControllerWidget(), this.createValueWidget(protocol.decimals)]
      }
    }

    return {
      description: "Can't undelegate",
      isAvailable: false
    }
  }

  private createExtraActions(protocol: PolkadotProtocol, availableActions: DelegatorAction[]): AirGapExtraDelegatorAction[] {
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
            args = [this.createValueWidget(protocol.decimals)]
            break
          case PolkadotStakingActionType.BOND_EXTRA:
            label = 'Bond Extra'
            confirmLabel = 'Bond'
            description = 'Bond extra description'
            args = [this.createValueWidget(protocol.decimals)]
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
            args = [this.createPayeeWidget()]
            break
          case PolkadotStakingActionType.CHANGE_CONTROLLER:
            label = 'Change Controller'
            confirmLabel = 'Change'
            description = 'Change controller description'
            args = [this.createControllerWidget()]
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

  private createValueWidget(decimals: number): UIInputText {
    return new UIInputText({
      id: 'value',
      inputType: 'number',
      label: 'Amount',
      placeholder: '0.0',
      defaultValue: '0.0',
      createExtraLabel: (value: string) => `$${new BigNumber(value || 0).multipliedBy(this.wallet.currentMarketPrice).toFixed(2)}`,
      customizeInput: (value: string) => new BigNumber(value).shiftedBy(decimals).toString()
    })
  }

  private createTipWidget(decimals: number): UIInputText {
    return new UIInputText({
      id: 'tip',
      inputType: 'number',
      label: 'Tip',
      placeholder: '0.0',
      defaultValue: '0.0',
      createExtraLabel: (value: string) => `$${new BigNumber(value || 0).multipliedBy(this.wallet.currentMarketPrice).toFixed(2)}`,
      customizeInput: (value: string) => new BigNumber(value).shiftedBy(decimals).toString()
    })
  }

  private createPayeeWidget(defaultOption?: PolkadotRewardDestination): UISelect {
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

  private createKeepControllerWidget(): UICheckbox {
    return new UICheckbox({
      id: 'keepController',
      label: 'Keep Controller',
      defaultValue: true
    })
  }

  private createControllerWidget(): UIInputText {
    return new UIInputText({
      id: 'controller',
      inputType: 'string',
      label: 'Controller'
    })
  }

  private async createExtraDetails(protocol: PolkadotProtocol, address: PolkadotAddress): Promise<UIWidget[]> {
    const extraDetails = []

    const results = await Promise.all([protocol.nodeClient.getRewardDestination(address), protocol.nodeClient.getBonded(address)])

    const payee = results[0]
    if (payee !== null) {
      extraDetails.push(...(await this.createRewardDetailsWidgets(payee)))
    }

    const controller = results[1]
    if (controller) {
      extraDetails.push(...(await this.createStakingDetails(protocol, address, controller)))
    }

    return extraDetails
  }

  private async createRewardDetailsWidgets(payee: PolkadotRewardDestination): Promise<UIWidget[]> {
    let details = []

    let rewardDestination = ''
    switch (payee) {
      case PolkadotRewardDestination.Staked:
        rewardDestination = 'Staked'
        break
      case PolkadotRewardDestination.Stash:
        rewardDestination = 'Stash'
        break
      case PolkadotRewardDestination.Controller:
        rewardDestination = 'Controller'
        break
    }

    details.push(
      new UIIconText({
        iconName: 'logo-usd',
        text: rewardDestination,
        description: 'Reward Destination'
      })
    )

    return details
  }

  private async createStakingDetails(
    protocol: PolkadotProtocol,
    address: PolkadotAddress,
    controller: PolkadotAddress
  ): Promise<UIWidget[]> {
    const details = []

    const stakingResults = await Promise.all([
      protocol.accountController.isNominating(address.toString()),
      protocol.nodeClient.getLedger(controller)
    ])
    const isNominating = stakingResults[0]
    const stakingLedger = stakingResults[1]

    if (stakingLedger) {
      details.push(...(await this.createStakingLedgerDetailsWidgets(protocol, isNominating, stakingLedger)))
    }

    details.push(
      new UIAccount({
        address: controller.toString(),
        description: 'Controller',
        abbreviateAddress: true,
        abbreviationStart: 9,
        abbreviationEnd: 9
      })
    )

    return details
  }

  private async createStakingLedgerDetailsWidgets(
    protocol: PolkadotProtocol,
    isNominating: boolean,
    stakingLedger: PolkadotStakingLedger
  ): Promise<UIWidget[]> {
    const details = []

    const totalBonded = stakingLedger.total.value
    const activeBonded = stakingLedger.active.value

    if (totalBonded.eq(activeBonded)) {
      details.push(
        new UIIconText({
          iconName: 'wallet',
          text: `${totalBonded.shiftedBy(-protocol.decimals).toString()} ${protocol.marketSymbol}`,
          description: isNominating ? 'Delegated' : 'Bonded'
        })
      )
    } else {
      details.push(
        new UIIconText({
          iconName: 'wallet',
          text: `${stakingLedger ? stakingLedger.active.value.shiftedBy(-protocol.decimals).toString() : '-'} ${protocol.marketSymbol}`,
          description: isNominating ? 'Active Delegated' : 'Active Bonded'
        })
      )

      details.push(
        new UIIconText({
          iconName: 'wallet',
          text: `${stakingLedger ? stakingLedger.total.value.shiftedBy(-protocol.decimals).toString() : '-'} ${protocol.marketSymbol}`,
          description: isNominating ? 'Total Delegated' : 'Total Bonded'
        })
      )
    }

    return details
  }
}
