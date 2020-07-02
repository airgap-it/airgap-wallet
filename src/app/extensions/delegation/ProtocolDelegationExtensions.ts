import { AirGapMarketWallet, ICoinDelegateProtocol } from 'airgap-coin-lib'
import BigNumber from 'bignumber.js'
import { AirGapDelegationDetails, IAirGapCoinDelegateProtocol } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountExtendedDetails } from 'src/app/models/widgets/display/UIAccountExtendedDetails'
import { UIAccountSummary } from 'src/app/models/widgets/display/UIAccountSummary'
import { UIRewardList } from 'src/app/models/widgets/display/UIRewardList'
import { UIInputText, UIInputTextConfig } from 'src/app/models/widgets/input/UIInputText'

export abstract class ProtocolDelegationExtensions<T extends ICoinDelegateProtocol> {
  private static readonly extensionProperitesWithType: [keyof IAirGapCoinDelegateProtocol, 'property' | 'function'][] = [
    ['delegateeLabel', 'property'],
    ['airGapDelegatee', 'function'],
    ['getExtraDelegationDetailsFromAddress', 'function'],
    ['createDelegateesSummary', 'function'],
    ['getRewardDisplayDetails', 'function'],
    ['createAccountExtendedDetails', 'function']
  ]

  public static async load<T extends ICoinDelegateProtocol>(
    protocol: new () => T,
    extensionFactory: () => Promise<ProtocolDelegationExtensions<T>>
  ) {
    const alreadyLoaded = this.extensionProperitesWithType
      .map(([propertyKey, _]) => this.hasProperty(protocol, propertyKey))
      .some(hasProperty => hasProperty)

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
      target.prototype[propertyKey] = function(...args) {
        return owner[propertyKey](this, ...args)
      }
    }
  }

  public abstract airGapDelegatee(protocol: T): string | undefined
  public abstract delegateeLabel: string

  public abstract getExtraDelegationDetailsFromAddress(
    protocol: T,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]>

  public getRewardDisplayDetails(_protocol: T, _delegator: string, _delegatees: string[]): Promise<UIRewardList | undefined> {
    return undefined // by default display no rewards
  }

  public async createDelegateesSummary(protocol: T, delegatees: string[]): Promise<UIAccountSummary[]> {
    const delegateesDetails = await Promise.all(delegatees.map(delegatee => protocol.getDelegateeDetails(delegatee)))
    return delegateesDetails.map(
      details =>
        new UIAccountSummary({
          address: details.address,
          header: [details.name, ''],
          description: [details.address, '']
        })
    )
  }

  public async createAccountExtendedDetails(_protocol: T, _address: string): Promise<UIAccountExtendedDetails> {
    // default implementation provides no details
    return new UIAccountExtendedDetails({
      items: []
    })
  }

  protected createAmountWidget(id: string, maxValue: string, config: Partial<UIInputTextConfig> = {}): UIInputText {
    return new UIInputText({
      id,
      inputType: 'number',
      label: 'Amount',
      placeholder: '0.00',
      defaultValue: maxValue,
      toggleFixedValueButton: 'Max',
      fixedValue: maxValue,
      errorLabel: 'Invalid value',
      createExtraLabel: (value: string, wallet?: AirGapMarketWallet) => {
        if (wallet) {
          const marketPrice = new BigNumber(value || 0).multipliedBy(wallet.currentMarketPrice)
          return `$${marketPrice.toFixed(2)}`
        } else {
          return ''
        }
      },
      ...config
    })
  }
}
