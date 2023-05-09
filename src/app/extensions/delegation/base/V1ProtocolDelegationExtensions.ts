import { ICoinDelegateProtocolAdapter } from '@airgap/angular-core'
import { AirGapOnlineProtocol } from '@airgap/module-kit'
import { AirGapDelegateProtocol } from '@airgap/module-kit/internal'
import { AirGapDelegationDetails } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountExtendedDetails } from 'src/app/models/widgets/display/UIAccountExtendedDetails'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { DefaultProtocolDelegationExtensions, ProtocolDelegationExtensions } from './ProtocolDelegationExtensions'

export abstract class V1ProtocolDelegationExtensions<
  T extends AirGapOnlineProtocol & AirGapDelegateProtocol
> extends ProtocolDelegationExtensions {
  public static async load<T extends AirGapOnlineProtocol & AirGapDelegateProtocol>(
    adapter: ICoinDelegateProtocolAdapter<T>,
    extensionFactory: () => Promise<V1ProtocolDelegationExtensions<T>>
  ) {
    const alreadyLoaded = this.extensionProperitesWithType
      .map(([propertyKey, _]) => this.hasProperty(adapter, propertyKey))
      .some((hasProperty) => hasProperty)

    if (!alreadyLoaded) {
      const extensions = await extensionFactory()
      this.extend(adapter, extensions, ...this.extensionProperitesWithType)
    }
  }

  private static hasProperty(target: any, propertyKey: string): boolean {
    return target[propertyKey] !== undefined
  }

  private static extend(target: any, owner: any, ...keys: [string, 'property' | 'function'][]) {
    for (let [key, type] of keys) {
      switch (type) {
        case 'property':
          target[key] = owner[key]
          break
        case 'function':
          target[key] = function (...args) {
            return owner[key](target, ...args)
          }
          break
      }
    }
  }

  private readonly defaults: DefaultProtocolDelegationExtensions<
    ICoinDelegateProtocolAdapter<T>
  > = new DefaultProtocolDelegationExtensions()

  public abstract delegateeLabel: string
  public abstract delegateeLabelPlural: string
  public abstract supportsMultipleDelegations: boolean

  public airGapDelegatee(adapter: ICoinDelegateProtocolAdapter<T>): string | undefined {
    return this.defaults.airGapDelegatee(adapter)
  }

  public async getExtraDelegationDetailsFromAddress(
    adapter: ICoinDelegateProtocolAdapter<T>,
    publicKey: string,
    delegator: string,
    delegatees: string[],
    data?: any
  ): Promise<AirGapDelegationDetails[]> {
    return this.defaults.getExtraDelegationDetailsFromAddress(adapter, publicKey, delegator, delegatees, data)
  }

  public getRewardDisplayDetails(
    adapter: ICoinDelegateProtocolAdapter<T>,
    delegator: string,
    delegatees: string[],
    data?: any
  ): Promise<UIRewardList | undefined> {
    return this.defaults.getRewardDisplayDetails(adapter, delegator, delegatees, data)
  }

  public async createDelegateesSummary(
    adapter: ICoinDelegateProtocolAdapter<T>,
    delegatees: string[],
    data?: any
  ): Promise<UIAccountSummary[]> {
    return this.defaults.createDelegateesSummary(adapter, delegatees, data)
  }

  public async createAccountExtendedDetails(
    adapter: ICoinDelegateProtocolAdapter<T>,
    publicKey: string,
    address: string,
    data?: any
  ): Promise<UIAccountExtendedDetails> {
    return this.defaults.createAccountExtendedDetails(adapter, publicKey, address, data)
  }
}
