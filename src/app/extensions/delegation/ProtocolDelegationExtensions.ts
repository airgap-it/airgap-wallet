import { ICoinDelegateProtocol } from 'airgap-coin-lib'
import { AirGapDelegateeDetails, AirGapDelegatorDetails } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'

export abstract class ProtocolDelegationExtensions<T extends ICoinDelegateProtocol> {
  private static readonly AIR_GAP_DELEGATEE_KEY = 'airGapDelegatee'
  private static readonly DELEGATEE_LABEL_KEY = 'delegateeLabel'
  private static readonly GET_EXTRA_DELEGATEES_DETAILS_KEY = 'getExtraDelegateesDetails'
  private static readonly GET_EXTRA_DELEGATOR_DETAILS_FROM_ADDRESS_KEY = 'getExtraDelegatorDetailsFromAddress'

  public static load<T extends ICoinDelegateProtocol>(protocol: new () => T, extensions: ProtocolDelegationExtensions<T>) {
    const alreadyLoaded =
      this.hasProperty(protocol, ProtocolDelegationExtensions.DELEGATEE_LABEL_KEY) &&
      this.hasProperty(protocol, ProtocolDelegationExtensions.GET_EXTRA_DELEGATEES_DETAILS_KEY) &&
      this.hasProperty(protocol, ProtocolDelegationExtensions.GET_EXTRA_DELEGATOR_DETAILS_FROM_ADDRESS_KEY)

    if (!alreadyLoaded) {
      this.extend(
        protocol,
        extensions,
        [ProtocolDelegationExtensions.AIR_GAP_DELEGATEE_KEY, 'property'],
        [ProtocolDelegationExtensions.DELEGATEE_LABEL_KEY, 'property'],
        [ProtocolDelegationExtensions.GET_EXTRA_DELEGATEES_DETAILS_KEY, 'function'],
        [ProtocolDelegationExtensions.GET_EXTRA_DELEGATOR_DETAILS_FROM_ADDRESS_KEY, 'function']
      )
    }
  }

  private static hasProperty(target: any, propertyKey: string): boolean {
    return target.prototype[propertyKey] !== undefined
  }

  private static extend(target: any, extensions: any, ...keys: [string, 'property' | 'function'][]) {
    for (let [key, type] of keys) {
      let extendMethod: (target: any, owner: any, key: string) => void
      switch (type) {
        case 'property':
          extendMethod = this.extendWithProperty
          break
        case 'function':
          extendMethod = this.extendWithFunction
          break
      }
      extendMethod(target, extensions, key)
    }
  }

  private static extendWithProperty(target: any, owner: any, propertyKey: string) {
    if (delete target.prototype[propertyKey]) {
      Object.defineProperty(target.prototype, propertyKey, {
        value: owner[propertyKey],
        enumerable: false,
        writable: false,
        configurable: false
      })
    }
  }

  private static extendWithFunction(target: any, owner: any, propertyKey: string) {
    target.prototype[propertyKey] = function(...args) {
      return owner[propertyKey](this, ...args)
    }
  }

  public abstract airGapDelegatee?: string
  public abstract delegateeLabel: string
  public abstract getExtraDelegateesDetails(protocol: T, addresses: string[]): Promise<Partial<AirGapDelegateeDetails>[]>
  public abstract getExtraDelegatorDetailsFromAddress(protocol: T, address: string): Promise<Partial<AirGapDelegatorDetails>>
}
