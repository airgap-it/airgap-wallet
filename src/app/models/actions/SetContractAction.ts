import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Action } from '@airgap/coinlib-core/actions/Action'
import { Router } from '@angular/router'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

import { WalletActionInfo } from '../ActionGroup'

export interface SetContractActionContext {
  wallet: AirGapMarketWallet
  dataService: DataService
  router: Router
}

export class SetContractAction extends Action<void, SetContractActionContext> {
  public get identifier() {
    return 'set-contract-action'
  }

  public info: WalletActionInfo = {
    name: 'account-transaction-list.set-contract_label',
    icon: 'construct-outline'
  }

  protected async perform(): Promise<void> {
    const [protocolIdentifier, protocolNetworkIdentifier] = await Promise.all([
      this.context.wallet.protocol.getIdentifier(),
      this.context.wallet.protocol.getOptions().then((options) => options.network.identifier)
    ])

    this.context.router
      .navigateByUrl(`/set-contract/${DataServiceKey.PROTOCOL}/${protocolIdentifier}/${protocolNetworkIdentifier}`)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
