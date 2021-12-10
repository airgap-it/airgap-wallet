import { UiEventService } from '@airgap/angular-core'
import { Router } from '@angular/router'
import { AlertController, LoadingController, PopoverController, ToastController } from '@ionic/angular'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Action } from '@airgap/coinlib-core/actions/Action'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletActionInfo } from '../ActionGroup'

export interface TipUsActionContext {
  wallet: AirGapMarketWallet
  tipAddress: string
  amount: string
  alertTitle: string
  alertDescription: string
  isAccepted?: boolean
  popoverController: PopoverController
  loadingController: LoadingController
  uiEventService: UiEventService
  alertController: AlertController
  toastController: ToastController
  dataService: DataService
  router: Router
}

export class AirGapTipUsAction extends Action<void, TipUsActionContext> {
  public get identifier(): string {
    return 'tip-us-action'
  }
  public readonly info: WalletActionInfo = {
    name: 'Tip Us',
    icon: 'logo-usd'
  }
  public readonly context: TipUsActionContext

  protected async perform(): Promise<void> {
    await this.showAlert()
    if (this.context.isAccepted) {
      this.context.dataService.setData(DataServiceKey.DETAIL, {
        wallet: this.context.wallet,
        address: this.context.tipAddress,
        amount: this.context.amount
      })

      this.context.router
        .navigateByUrl(
          `/transaction-prepare/${DataServiceKey.DETAIL}/${this.context.wallet.publicKey}/${this.context.wallet.protocol.identifier}/${
            this.context.wallet.addressIndex
          }/${this.context.tipAddress}/${this.context.amount}/undefined/${'not_forced'}`
        )
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      // Do nothing
    }
  }

  private async showAlert(): Promise<void> {
    return new Promise<void>(async (resolve) => {
      await this.context.uiEventService.showTranslatedAlert({
        header: this.context.alertTitle ? this.context.alertTitle : 'action-alert-tip.heading',
        message: this.context.alertDescription ? this.context.alertDescription : 'action-alert-tip.text',
        buttons: [
          {
            text: 'action-alert-tip.cancel_label',
            role: 'cancel',
            cssClass: 'secondary',
            handler: (): void => {
              this.context.isAccepted = false
              resolve()
            }
          },
          {
            text: 'action-alert-tip.ok_label',
            handler: (): void => {
              this.context.isAccepted = true
              resolve()
            }
          }
        ]
      })
    })
  }
}
