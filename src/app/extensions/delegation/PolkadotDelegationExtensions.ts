import { PolkadotProtocol } from 'airgap-coin-lib'
import { AirGapDelegateeDetails, AirGapDelegatorDetails } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { extensionProperty, extensionFunction } from '../decorators'
import { PolkadotAddress } from 'airgap-coin-lib/dist/protocols/polkadot/account/PolkadotAddress'
import BigNumber from 'bignumber.js'
import { UIIconText } from 'src/app/models/widgets/UIIconText'
import { UIWidget } from 'src/app/models/widgets/UIWidget'

export class PolkadotDelegationExtensions {
  @extensionProperty(PolkadotProtocol)
  static delegateeLabel: string = 'Validator'

  @extensionFunction(PolkadotProtocol)
  static async getExtraDelegateeDetails(protocol: PolkadotProtocol, address: string): Promise<Partial<AirGapDelegateeDetails>> {
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
        new UIIconText('logo-usd', validatorDetails.commission + '%' || '-', 'Comission')
      ]
    }
  }

  @extensionFunction(PolkadotProtocol)
  static async getExtraDelegatorDetailsFromAddress(protocol: PolkadotProtocol, address: string): Promise<Partial<AirGapDelegatorDetails>> {
    const publicKey = PolkadotAddress.fromEncoded(address).getHexPublicKey()
    const availableActions = await protocol.accountController.getAvailableDelegatorActions(publicKey)

    // TODO: add translations
    const widgetActions = availableActions.map(availableAction => {
      let label: string
      let action: string
      let args: UIWidget[]

      return {
        type: availableAction.type,
        label,
        action,
        args
      }
    })
    return {
      availableActions: widgetActions
    }
  }
}
