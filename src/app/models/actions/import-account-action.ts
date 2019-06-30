import { TezosKtProtocol } from 'airgap-coin-lib'

import { Action, ActionProgress } from '../Action'
import { WalletActionInfo } from '../ActionGroup'

export interface ImportAccoutActionContext {
  publicKey: string
}

export class ImportAccountAction extends Action<ImportAccoutActionContext, ActionProgress<void>, string[]> {
  public readonly identifier: string = 'tezos-import-account-action'
  public readonly info: WalletActionInfo = {
    name: 'account-transaction-list.import-accounts_label',
    icon: 'add'
  }

  public readonly handlerFunction = async (context: ImportAccoutActionContext): Promise<string[]> => {
    const protocol: TezosKtProtocol = new TezosKtProtocol()
    const ktAddresses: string[] = await protocol.getAddressesFromPublicKey(context.publicKey)

    return ktAddresses
  }
}
