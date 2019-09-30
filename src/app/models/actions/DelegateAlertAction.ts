import { AlertController, PopoverController } from '@ionic/angular'
import { AlertOptions } from '@ionic/core'
import { Action } from 'airgap-coin-lib/dist/actions/Action'

import { LanguageService } from '../../services/language.service'
import { WalletActionInfo } from '../ActionGroup'

import { AirGapDelegateAction, AirGapDelegateActionContext } from './TezosDelegateAction'

export interface DelegateAlertActionContext extends AirGapDelegateActionContext {
  isAccepted?: boolean
  popoverController: PopoverController
  languageService: LanguageService
  alertController: AlertController
  alertTitle: string
  alertDescription: string
}

export class DelegateAlertAction extends Action<void, DelegateAlertActionContext> {
  public readonly identifier: string = 'tip-us-action'
  public readonly info: WalletActionInfo = {
    name: 'Tip Us',
    icon: 'logo-usd'
  }
  private readonly delegateAction: AirGapDelegateAction

  constructor(context: DelegateAlertActionContext) {
    super(context)
    this.delegateAction = new AirGapDelegateAction(context)
  }

  protected async perform(): Promise<void> {
    await this.showAlert()
    if (this.context.isAccepted) {
      await this.delegateAction.start()
    } else {
      // Do nothing
    }
  }

  private async showAlert(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const translatedAlert: AlertOptions = await this.context.languageService.getTranslatedAlert(
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
      if (this.context.alertTitle) {
        translatedAlert.header = this.context.alertTitle
      }
      if (this.context.alertDescription) {
        translatedAlert.message = this.context.alertDescription
      }

      const alert: HTMLIonAlertElement = await this.context.alertController.create(translatedAlert)

      await alert.present()
    })
  }
}
