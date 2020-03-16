import { ICoinProtocol, ICoinDelegateProtocol } from 'airgap-coin-lib'

export function supportsDelegation(protocol: ICoinProtocol): protocol is ICoinDelegateProtocol {
    const delegateProtocol = protocol as ICoinDelegateProtocol
    return (
        !!delegateProtocol.getDelegateeDetails &&
        !!delegateProtocol.getDelegatorDetailsFromPublicKey &&
        !!delegateProtocol.getDelegatorDetailsFromAddress &&
        !!delegateProtocol.prepareDelegatorActionFromPublicKey
    )
}
