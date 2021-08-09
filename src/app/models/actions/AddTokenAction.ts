import { NavController } from '@ionic/angular'
import { Action } from '@airgap/coinlib-core/actions/Action'

import { IAccountWrapper } from '../../pages/sub-account-add/sub-account-add'
import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletActionInfo } from '../ActionGroup'

export interface AddTokenActionContext {
  subAccounts: IAccountWrapper[]
  accountProvider: AccountProvider
  location: NavController
}

export class AddTokenAction extends Action<void, AddTokenActionContext> {
  public get identifier(): string {
    return 'add-token-action'
  }

  public info: WalletActionInfo = {
    name: 'account-transaction-list.add-tokens_label',
    icon: 'add-outline'
  }

  protected async perform(): Promise<void> {
    this.context.subAccounts
      .filter((account: IAccountWrapper) => account.selected)
      .forEach(async (account: IAccountWrapper) => {
        const walletAddInfos = [
          {
            walletToAdd: account.wallet,
            groupId: account.groupId,
            groupLabel: account.groupLabel
          }
        ]
        this.context.accountProvider.addWallets(walletAddInfos).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
      })
  }
}
