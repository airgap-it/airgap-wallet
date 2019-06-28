import { TezosKtProtocol } from 'airgap-coin-lib'

import { Action } from '../Action'

export class ViewDelegationAction extends Action<any, any, any> {
  public readonly identifier: string = 'tezos-delegate-action'
  public readonly info = {
    name: 'account-transaction-list.delegation-status_label',
    icon: 'md-information-circle'
  }

  public readonly handlerFunction = async (context: any): Promise<string[]> => {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(context.publicKey)

    return ktAddresses
  }
}
