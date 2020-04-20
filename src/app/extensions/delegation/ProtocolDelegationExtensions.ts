import { ICoinDelegateProtocol, AirGapMarketWallet } from 'airgap-coin-lib'
import { AirGapDelegationDetails } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { UIInputTextConfig, UIInputText } from 'src/app/models/widgets/input/UIInputText'
import BigNumber from 'bignumber.js'

export abstract class ProtocolDelegationExtensions<T extends ICoinDelegateProtocol> {
  private static readonly AIR_GAP_DELEGATEE_KEY = 'airGapDelegatee'
  private static readonly DELEGATEE_LABEL_KEY = 'delegateeLabel'
  private static readonly GET_EXTRA_DELEGATION_DETAILS_FROM_ADDRESS_KEY = 'getExtraDelegationDetailsFromAddress'

  public static load<T extends ICoinDelegateProtocol>(protocol: new () => T, extensions: ProtocolDelegationExtensions<T>) {
    const alreadyLoaded =
      this.hasProperty(protocol, ProtocolDelegationExtensions.DELEGATEE_LABEL_KEY) &&
      this.hasProperty(protocol, ProtocolDelegationExtensions.GET_EXTRA_DELEGATION_DETAILS_FROM_ADDRESS_KEY)

    if (!alreadyLoaded) {
      this.extend(
        protocol,
        extensions,
        [ProtocolDelegationExtensions.AIR_GAP_DELEGATEE_KEY, 'property'],
        [ProtocolDelegationExtensions.DELEGATEE_LABEL_KEY, 'property'],
        [ProtocolDelegationExtensions.GET_EXTRA_DELEGATION_DETAILS_FROM_ADDRESS_KEY, 'function']
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

  public abstract getExtraDelegationDetailsFromAddress(
    protocol: T,
    delegator: string,
    delegatees: string[]
  ): Promise<AirGapDelegationDetails[]>

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
