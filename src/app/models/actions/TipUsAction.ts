import { Router } from '@angular/router'
import { AlertController, PopoverController, ToastController } from '@ionic/angular'
import { AlertOptions } from '@ionic/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Action, ActionProgress } from 'airgap-coin-lib/dist/actions/Action'

import { DataService, DataServiceKey } from '../../services/data/data.service'
import { LanguageService } from '../../services/language.service'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { WalletActionInfo } from '../ActionGroup'

export interface TipUsActionEnvironment {
  popoverController: PopoverController
  languageService: LanguageService
  alertController: AlertController
  toastController: ToastController
  dataService: DataService
  router: Router
}

export interface TipUsActionContext<T> {
  wallet: AirGapMarketWallet
  tipAddress: string
  amount: string
  isAccepted?: boolean
  env: T
}

export class AirGapTipUsAction extends Action<TipUsActionContext<TipUsActionEnvironment>, ActionProgress<void>, void> {
  public readonly identifier: string = 'tip-us-action'
  public readonly info: WalletActionInfo = {
    name: 'Tip Us',
    icon: 'logo-usd'
  }

  constructor(context: TipUsActionContext<TipUsActionEnvironment>) {
    super(context)
    console.log('CONSTRUCTOR')
  }

  public readonly prepareFunction = async (): Promise<void> => {
    console.log('ASDASD')

    return new Promise<void>(async (resolve, reject) => {
      const translatedAlert: AlertOptions = await this.context.env.languageService.getTranslatedAlert(
        'delegate-edit-popover.heading',
        'delegate-edit-popover.text',
        [
          {
            name: 'bakerAddress',
            id: 'baker-address',
            placeholder: 'delegate-edit-popover.baker-address_label'
          }
        ],
        [
          {
            text: 'delegate-edit-popover.cancel_label',
            role: 'cancel',
            cssClass: 'secondary',
            handler: (): void => {
              // this.context.env.popoverController.dismiss()
              this.context.isAccepted = false
              resolve()
            }
          },
          {
            text: 'delegate-edit-popover.set-baker_label',
            handler: (): void => {
              // this.context.env.popoverController.dismiss()
              this.context.isAccepted = true
              resolve()
            }
          }
        ]
      )
      const alert: HTMLIonAlertElement = await this.context.env.alertController.create(translatedAlert)

      await alert.present()
    })
  }

  public readonly handlerFunction = async (): Promise<void> => {
    if (this.context.isAccepted) {
      this.context.env.dataService.setData(DataServiceKey.DETAIL, {
        wallet: this.context.wallet,
        address: this.context.tipAddress,
        amount: this.context.amount
      })

      this.context.env.router
        .navigateByUrl(`/transaction-prepare/${DataServiceKey.DETAIL}`)
        .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      // Do nothing
    }
  }
}
