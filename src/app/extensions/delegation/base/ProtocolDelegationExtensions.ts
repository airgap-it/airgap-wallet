// tslint:disable: max-classes-per-file
import { AirGapMarketWallet, ICoinDelegateProtocol } from '@airgap/coinlib-core'
import BigNumber from 'bignumber.js'

import { AirGapDelegationDetails, IAirGapCoinDelegateProtocol } from '../../../interfaces/IAirGapCoinDelegateProtocol'
import { UIAccountExtendedDetails } from '../../../models/widgets/display/UIAccountExtendedDetails'
import { UIAccountSummary } from '../../../models/widgets/display/UIAccountSummary'
import { UIRewardList } from '../../../models/widgets/display/UIRewardList'
import { UIInputText, UIInputTextConfig } from '../../../models/widgets/input/UIInputText'

export abstract class ProtocolDelegationExtensions {
  protected static readonly extensionProperitesWithType: [keyof IAirGapCoinDelegateProtocol, 'property' | 'function'][] = [
    ['delegateeLabel', 'property'],
    ['airGapDelegatee', 'function'],
    ['delegateeLabelPlural', 'property'],
    ['supportsMultipleDelegations', 'property'],
    ['getExtraDelegationDetailsFromAddress', 'function'],
    ['createDelegateesSummary', 'function'],
    ['getRewardDisplayDetails', 'function'],
    ['createAccountExtendedDetails', 'function']
  ]

  protected createAmountWidget(id: string, maxValue?: string, minValue?: string, config: Partial<UIInputTextConfig> = {}): UIInputText {
    return new UIInputText({
      id,
      inputType: 'number',
      label: 'delegation-detail.amount_label',
      placeholder: '0.00',
      defaultValue: maxValue || minValue,
      toggleFixedValueButton: maxValue !== undefined ? 'delegation-detail.max-amount_button' : undefined,
      fixedValue: maxValue,
      errorLabel: 'delegation-detail.invalid-value_error',
      createExtraLabel: (value: string, wallet?: AirGapMarketWallet) => {
        if (wallet) {
          const marketPrice = new BigNumber(value || 0).multipliedBy(wallet.getCurrentMarketPrice())
          return `$${marketPrice.toFixed(2)}`
        } else {
          return ''
        }
      },
      ...config
    })
  }
}

export class DefaultProtocolDelegationExtensions<T extends ICoinDelegateProtocol> {
  public airGapDelegatee(_protocol: T): string | undefined {
    return undefined
  }

  public async getExtraDelegationDetailsFromAddress(
    _protocol: T,
    _publicKey: string,
    _delegator: string,
    _delegatees: string[],
    _data?: any
  ): Promise<AirGapDelegationDetails[]> {
    return []
  }

  public getRewardDisplayDetails(_protocol: T, _delegator: string, _delegatees: string[], _data?: any): Promise<UIRewardList | undefined> {
    return undefined // by default display no rewards
  }

  public async createDelegateesSummary(protocol: T, delegatees: string[], _data?: any): Promise<UIAccountSummary[]> {
    const delegateesDetails = await Promise.all(delegatees.map((delegatee) => protocol.getDelegateeDetails(delegatee)))
    return delegateesDetails.map(
      (details) =>
        new UIAccountSummary({
          address: details.address,
          header: [details.name, ''],
          description: [details.address, '']
        })
    )
  }

  public async createAccountExtendedDetails(_protocol: T, _publicKey: string, _address: string, _data?: any): Promise<UIAccountExtendedDetails> {
    // default implementation provides no details
    return new UIAccountExtendedDetails({
      items: []
    })
  }
}
