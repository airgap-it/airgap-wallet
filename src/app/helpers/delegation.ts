import { ICoinProtocol, ICoinDelegateProtocol } from 'airgap-coin-lib'
import { IAirGapCoinDelegateProtocol } from '../interfaces/IAirGapCoinDelegateProtocol'

export function supportsDelegation(protocol: ICoinProtocol): protocol is ICoinDelegateProtocol {
  const delegateProtocol = protocol as ICoinDelegateProtocol
  return (
    !!delegateProtocol.getDefaultDelegatee &&
    !!delegateProtocol.getCurrentDelegateesForPublicKey &&
    !!delegateProtocol.getCurrentDelegateesForAddress &&
    !!delegateProtocol.getDelegateesDetails &&
    !!delegateProtocol.isPublicKeyDelegating &&
    !!delegateProtocol.isAddressDelegating &&
    !!delegateProtocol.getDelegatorDetailsFromPublicKey &&
    !!delegateProtocol.getDelegatorDetailsFromAddress &&
    !!delegateProtocol.prepareDelegatorActionFromPublicKey
  )
}

export function supportsAirGapDelegation(protocol: ICoinProtocol): protocol is IAirGapCoinDelegateProtocol {
  const delegateProtocol = protocol as IAirGapCoinDelegateProtocol
  return (
    delegateProtocol.delegateeLabel !== undefined &&
    !!delegateProtocol.getExtraDelegateesDetails &&
    !!delegateProtocol.getExtraDelegatorDetailsFromAddress
  )
}
