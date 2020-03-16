import { ICoinProtocol, ICoinDelegateProtocol } from 'airgap-coin-lib'
import { IAirGapCoinDelegateProtocol } from '../interfaces/IAirGapCoinDelegateProtocol'

export function supportsDelegation(protocol: ICoinProtocol): protocol is ICoinDelegateProtocol {
  const delegateProtocol = protocol as ICoinDelegateProtocol
  return (
    !!delegateProtocol.getDelegateeDetails &&
    !!delegateProtocol.getDelegatorDetailsFromPublicKey &&
    !!delegateProtocol.getDelegatorDetailsFromAddress &&
    !!delegateProtocol.prepareDelegatorActionFromPublicKey
  )
}

export function supportsAirGapDelegation(protocol: ICoinProtocol): protocol is IAirGapCoinDelegateProtocol {
  const delegateProtocol = protocol as IAirGapCoinDelegateProtocol
  return (
    delegateProtocol.delegateeLabel !== undefined &&
    !!delegateProtocol.getExtraDelegateeDetails &&
    !!delegateProtocol.getExtraDelegatorDetailsFromAddress
  )
}
