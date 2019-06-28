import { AirGapMarketWallet } from 'airgap-coin-lib'

import { IAccountWrapper } from '../../pages/sub-account-add/sub-account-add'
import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { Action, ActionProgress } from '../Action'
import { WalletActionInfo } from '../ActionGroup'

export interface AddTokenActionContext {
  subAccounts: IAccountWrapper[]
  accountProvider: AccountProvider
}

export class AddTokenAction extends Action<AddTokenActionContext, ActionProgress<void>, void> {
  public readonly identifier: string = 'tezos-originate-action'
  public info: WalletActionInfo = {
    name: 'account-transaction-list.add-tokens_label',
    icon: 'add'
  }

  public readonly handlerFunction = async (context: AddTokenActionContext): Promise<void> => {
    context.subAccounts
      .filter((account: IAccountWrapper) => account.selected)
      .map((account: IAccountWrapper) => account.wallet)
      .forEach((wallet: AirGapMarketWallet) => {
        context.accountProvider.addWallet(wallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
      })
  }
}
