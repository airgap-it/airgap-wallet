import { Location } from '@angular/common'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Action } from 'airgap-coin-lib/dist/actions/Action'

import { IAccountWrapper } from '../../pages/sub-account-add/sub-account-add'
import { AccountProvider } from '../../services/account/account.provider'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletActionInfo } from '../ActionGroup'

export interface AddTokenActionContext {
  subAccounts: IAccountWrapper[]
  accountProvider: AccountProvider
  location: Location
}

export class AddTokenAction extends Action<void, AddTokenActionContext> {
  public readonly identifier: string = 'tezos-originate-action'

  public info: WalletActionInfo = {
    name: 'account-transaction-list.add-tokens_label',
    icon: 'add'
  }

  protected async perform(): Promise<void> {
    this.context.subAccounts
      .filter((account: IAccountWrapper) => account.selected)
      .map((account: IAccountWrapper) => account.wallet)
      .forEach((wallet: AirGapMarketWallet) => {
        this.context.accountProvider.addWallet(wallet).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))
      })
  }
}
