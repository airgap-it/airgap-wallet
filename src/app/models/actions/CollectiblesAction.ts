import { Action, AirGapMarketWallet } from '@airgap/coinlib-core'
import { Router } from '@angular/router'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { DataServiceKey } from '../../services/data/data.service'

export interface CollectiblesActionContext {
  wallet: AirGapMarketWallet
  router: Router
}

export class CollectiblesAction extends Action<void, CollectiblesActionContext> {
  public get identifier(): string {
    return 'collectibles-action'
  }

  protected async perform(): Promise<void> {
    this.context.router
      .navigateByUrl(
        `/collectibles-list/${DataServiceKey.DETAIL}/${this.context.wallet.publicKey}/${this.context.wallet.protocol.identifier}/${this.context.wallet.addressIndex}`
      )
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}