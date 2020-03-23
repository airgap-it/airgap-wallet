import { PolkadotProtocol } from 'airgap-coin-lib'
import { AirGapDelegateeDetails, AirGapDelegatorDetails } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { extensionProperty, extensionFunction } from '../../decorators'
import { PolkadotDelegationExtensionFunctionsProvider } from './PolkadotDelegationExtensionFunctionsProvider'

export class PolkadotDelegationExtensions {
  private static functionsProvider: PolkadotDelegationExtensionFunctionsProvider

  public static load() {
    PolkadotDelegationExtensions.functionsProvider = new PolkadotDelegationExtensionFunctionsProvider()
  }

  @extensionProperty(PolkadotProtocol)
  static airGapDelegatee: string = ''

  @extensionProperty(PolkadotProtocol)
  static delegateeLabel: string = 'Validator'

  @extensionFunction(PolkadotProtocol)
  static async getExtraDelegateesDetails(protocol: PolkadotProtocol, addresses: string[]): Promise<Partial<AirGapDelegateeDetails>[]> {
    return PolkadotDelegationExtensions.functionsProvider.getExtraDelegateesDetails(protocol, addresses)
  }

  @extensionFunction(PolkadotProtocol)
  static async getExtraDelegatorDetailsFromAddress(protocol: PolkadotProtocol, address: string): Promise<Partial<AirGapDelegatorDetails>> {
    return PolkadotDelegationExtensions.functionsProvider.getExtraDelegatorDetailsFromAddress(protocol, address)
  }
}
