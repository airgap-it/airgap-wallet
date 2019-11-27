import { ImportAccountAction } from 'airgap-coin-lib/dist/actions/GetKtAccountsAction'

import { WalletActionInfo } from '../ActionGroup'

export class AirGapGetKtAccountsAction extends ImportAccountAction {
  public readonly info: WalletActionInfo = {
    name: 'account-transaction-list.import-accounts_label',
    icon: 'add'
  }
}
