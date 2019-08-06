import { TezosKtProtocol } from 'airgap-coin-lib'
import { ImportAccountAction, ImportAccoutActionContext } from 'airgap-coin-lib/dist/actions/GetKtAccountsAction'

import { WalletActionInfo } from '../ActionGroup'

export class AirGapGetKtAccountsAction extends ImportAccountAction {
  public readonly info: WalletActionInfo = {
    name: 'account-transaction-list.import-accounts_label',
    icon: 'add'
  }
}
