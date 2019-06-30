import { Router } from '@angular/router'
import { AlertController, LoadingController, PopoverController, ToastController } from '@ionic/angular'
import { AlertOptions } from '@ionic/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { Action, ActionProgress } from 'airgap-coin-lib/dist/actions/Action'
import { DelegateActionContext } from 'airgap-coin-lib/dist/actions/DelegateAction'

import { DataService } from '../../services/data/data.service'
import { LanguageService } from '../../services/language.service'
import { WalletActionInfo } from '../ActionGroup'

import { AirGapDelegateAction, DelegateActionEnvironment } from './DelegateAction'

export interface DelegateAlertActionEnvironment {
  popoverController: PopoverController
  languageService: LanguageService
  loadingController: LoadingController
  alertController: AlertController
  toastController: ToastController
  dataService: DataService
  router: Router
}

export interface DelegateAlertActionContext<T> {
  wallet: AirGapMarketWallet
  delegateAddress: string
  isAccepted?: boolean
  env: T
}

export class DelegateAlertAction extends Action<DelegateAlertActionContext<DelegateAlertActionEnvironment>, ActionProgress<void>, void> {
  public readonly identifier: string = 'tip-us-action'
  public readonly info: WalletActionInfo = {
    name: 'Tip Us',
    icon: 'logo-usd'
  }

  constructor(context: DelegateAlertActionContext<DelegateAlertActionEnvironment>) {
    super(context)
    console.log('CONSTRUCTOR')
  }

  public readonly prepareFunction = async (): Promise<void> => {
    console.log('ASDASD')

    return new Promise<void>(async (resolve, reject) => {
      const translatedAlert: AlertOptions = await this.context.env.languageService.getTranslatedAlert(
        'action-alert-delegation.heading',
        'action-alert-delegation.text',
        [],
        [
          {
            text: 'action-alert-delegation.cancel_label',
            role: 'cancel',
            cssClass: 'secondary',
            handler: (): void => {
              this.context.isAccepted = false
              resolve()
            }
          },
          {
            text: 'action-alert-delegation.ok_label',
            handler: (): void => {
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
      const delegateAction: AirGapDelegateAction = new AirGapDelegateAction()

      delegateAction.prepareFunction = async (): Promise<DelegateActionContext<DelegateActionEnvironment>> => {
        return {
          wallet: this.context.wallet,
          delegate: this.context.delegateAddress,
          env: {
            toastController: this.context.env.toastController,
            loadingController: this.context.env.loadingController,
            dataService: this.context.env.dataService,
            router: this.context.env.router
          }
        }
      }

      await delegateAction.perform()
    } else {
      // Do nothing
    }
  }
}
