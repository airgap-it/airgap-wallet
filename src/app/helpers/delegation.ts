import { supportsV0Delegation } from '@airgap/angular-core'
import { ICoinDelegateProtocol, ICoinProtocol } from '@airgap/coinlib-core'

import { IAirGapCoinDelegateProtocol } from '../interfaces/IAirGapCoinDelegateProtocol'

export function supportsDelegation(protocol: ICoinProtocol): protocol is ICoinDelegateProtocol {
  return supportsV0Delegation(protocol)
}

export function supportsAirGapDelegation(protocol: ICoinProtocol): protocol is IAirGapCoinDelegateProtocol {
  const delegateProtocol = protocol as IAirGapCoinDelegateProtocol
  return (
    delegateProtocol.delegateeLabel !== undefined &&
    delegateProtocol.delegateeLabelPlural !== undefined &&
    delegateProtocol.supportsMultipleDelegations !== undefined &&
    !!delegateProtocol.getExtraDelegationDetailsFromAddress &&
    !!delegateProtocol.getRewardDisplayDetails &&
    !!delegateProtocol.createDelegateesSummary &&
    !!delegateProtocol.createAccountExtendedDetails &&
    !!delegateProtocol.getRewardDisplayDetails
  )
}
