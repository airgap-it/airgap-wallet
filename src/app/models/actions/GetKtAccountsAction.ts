import { TezosKtProtocol } from 'airgap-coin-lib'
import { ImportAccountAction, ImportAccoutActionContext } from 'airgap-coin-lib/dist/actions/GetKtAccountsAction'

import { WalletActionInfo } from '../ActionGroup'

export interface GetKtAccountsActionContext {
  publicKey: string
}

export class AirGapGetKtAccountsAction extends ImportAccountAction {
  public readonly identifier: string = 'tezos-import-account-action'
  public readonly info: WalletActionInfo = {
    name: 'account-transaction-list.import-accounts_label',
    icon: 'add'
  }

  public readonly handlerFunction = async (context?: ImportAccoutActionContext): Promise<string[]> => {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(context.publicKey)

    return ktAddresses
  }
}
