import { TezosKtProtocol } from 'airgap-coin-lib'

import { Action } from '../Action'
import { WalletActionInfo } from '../ActionGroup'

export class DelegateAction extends Action<any, any, any> {
  public readonly identifier: string = 'tezos-delegate-action'
  public readonly info: WalletActionInfo = {
    name: 'account-transaction-list.delegate_label',
    icon: 'logo-usd'
  }

  public readonly handlerFunction = async (context: any): Promise<string[]> => {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(context.publicKey)

    return ktAddresses
  }
}
