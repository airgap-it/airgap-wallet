import { ICoinProtocol, ICoinDelegateProtocol, TezosProtocol } from 'airgap-coin-lib'
import { IAirGapCoinDelegateProtocol } from '../interfaces/IAirGapCoinDelegateProtocol'
import { ProtocolSymbols } from '../services/protocols/protocols'

export function supportsDelegation(protocol: ICoinProtocol): protocol is ICoinDelegateProtocol {
  const delegateProtocol = protocol as ICoinDelegateProtocol

  // temporary until Tezos subprotocols stop inherit TezosProtocol and implement ICoinDelegateProtocol
  const supportingTezosProtocols: string[] = [ProtocolSymbols.XTZ, ProtocolSymbols.XTZ_KT]
  if (delegateProtocol instanceof TezosProtocol && !supportingTezosProtocols.includes(delegateProtocol.identifier)) {
    return false
  }

  return (
    delegateProtocol.supportsMultipleDelegatees !== undefined &&
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
    !!delegateProtocol.getExtraDelegatorDetailsFromAddress &&
    !!delegateProtocol.onDetailsChange
  )
}
