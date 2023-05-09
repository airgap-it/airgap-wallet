import { ICoinDelegateProtocol } from '@airgap/coinlib-core'

import { AirGapDelegationDetails } from '../../../interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountExtendedDetails } from '../../../models/widgets/display/UIAccountExtendedDetails'
import { UIAccountSummary } from '../../../models/widgets/display/UIAccountSummary'
import { UIRewardList } from '../../../models/widgets/display/UIRewardList'

import { DefaultProtocolDelegationExtensions, ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'

export abstract class V0ProtocolDelegationExtensions<T extends ICoinDelegateProtocol> extends ProtocolDelegationExtensions {
  public static async load<T extends ICoinDelegateProtocol>(
    protocol: new () => T,
    extensionFactory: () => Promise<V0ProtocolDelegationExtensions<T>>
  ) {
    const alreadyLoaded = this.extensionProperitesWithType
      .map(([propertyKey, _]) => this.hasProperty(protocol, propertyKey))
      .some((hasProperty) => hasProperty)

    if (!alreadyLoaded) {
      const extensions = await extensionFactory()
      this.extend(protocol, extensions, ...this.extensionProperitesWithType)
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
    if (delete target.prototype[propertyKey] && owner[propertyKey] !== undefined) {
      Object.defineProperty(target.prototype, propertyKey, {
        value: owner[propertyKey],
        enumerable: false,
        writable: false,
        configurable: false
      })
    }
  }

  private static extendWithFunction(target: any, owner: any, propertyKey: string) {
    if (owner[propertyKey] !== undefined) {
      target.prototype[propertyKey] = function (...args) {
        return owner[propertyKey](this, ...args)
      }
    }
  }

  private readonly defaults: DefaultProtocolDelegationExtensions<T> = new DefaultProtocolDelegationExtensions()

  public abstract delegateeLabel: string
  public abstract delegateeLabelPlural: string
  public abstract supportsMultipleDelegations: boolean

  public airGapDelegatee(protocol: T): string | undefined {
    return this.defaults.airGapDelegatee(protocol)
  }

  public getExtraDelegationDetailsFromAddress(
    protocol: T,
    publicKey: string,
    delegator: string,
    delegatees: string[],
    data?: any
  ): Promise<AirGapDelegationDetails[]> {
    return this.defaults.getExtraDelegationDetailsFromAddress(protocol, publicKey, delegator, delegatees, data)
  }

  public getRewardDisplayDetails(protocol: T, delegator: string, delegatees: string[], data?: any): Promise<UIRewardList | undefined> {
    return this.defaults.getRewardDisplayDetails(protocol, delegator, delegatees, data)
  }

  public async createDelegateesSummary(protocol: T, delegatees: string[], data?: any): Promise<UIAccountSummary[]> {
    return this.defaults.createDelegateesSummary(protocol, delegatees, data)
  }

  public async createAccountExtendedDetails(protocol: T, publicKey: string, address: string, data?: any): Promise<UIAccountExtendedDetails> {
    return this.defaults.createAccountExtendedDetails(protocol, publicKey, address, data)
  }
}
