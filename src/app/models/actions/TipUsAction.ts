import { Router } from '@angular/router'
import { AlertController, LoadingController, PopoverController, ToastController } from '@ionic/angular'
import { AlertOptions } from '@ionic/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Action } from 'airgap-coin-lib/dist/actions/Action'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { LanguageService } from '../../services/language.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletActionInfo } from '../ActionGroup'

export interface TipUsActionContext {
  wallet: AirGapMarketWallet
  tipAddress: string
  amount: string
  isAccepted?: boolean
  popoverController: PopoverController
  loadingController: LoadingController
  languageService: LanguageService
  alertController: AlertController
  toastController: ToastController
  dataService: DataService
  router: Router
}

export class AirGapTipUsAction extends Action<void, TipUsActionContext> {
  public readonly identifier: string = 'tip-us-action'
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

      this.context.router.navigateByUrl(`/transaction-prepare/${DataServiceKey.DETAIL}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      // Do nothing
    }
  }

  private async showAlert(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const translatedAlert: AlertOptions = await this.context.languageService.getTranslatedAlert(
        'action-alert-tip.heading',
        'action-alert-tip.text',
        [],
        [
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
      )
      const alert: HTMLIonAlertElement = await this.context.alertController.create(translatedAlert)

      await alert.present()
    })
  }
}
