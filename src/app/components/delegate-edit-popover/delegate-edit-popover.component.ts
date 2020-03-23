import { Component } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'

import { LanguageService } from '../../services/language/language.service'
import { AlertOptions } from '@ionic/angular/node_modules/@ionic/core'

@Component({
  selector: 'app-delegate-edit-popover',
  templateUrl: './delegate-edit-popover.component.html',
  styleUrls: ['./delegate-edit-popover.component.scss']
})
export class DelegateEditPopoverComponent {
  // TODO: remove isTezos flag when Tezos is successfully migrated to the generic delegation flow
  public readonly isTezos: boolean
  public readonly hideAirGap: boolean
  public readonly delegateeLabel: string

  constructor(
    private readonly alertController: AlertController,
    private readonly popoverController: PopoverController,
    private readonly languageService: LanguageService,
    private readonly navParams: NavParams
  ) {
    this.isTezos = this.navParams.get('isTezos')
    this.hideAirGap = this.navParams.get('hideAirGap')
    this.delegateeLabel = this.navParams.get('delegateeLabel')
  }

  public async changeDelegatee(): Promise<void> {
    const alertOptions = await (this.isTezos ? this.createTezosAlertOptions() : this.createAlertOptions())
    const alert: HTMLIonAlertElement = await this.alertController.create(alertOptions)

    await alert.present()
  }

  private async createAlertOptions(): Promise<AlertOptions> {
    // TODO: add translations
    return {
      header: 'Delegation Settings',
      message: `Enter the address provided to you by the ${this.delegateeLabel}.`,
      inputs: [
        {
          name: 'delegateeAddress',
          id: 'delegatee-address',
          placeholder: `${this.delegateeLabel} address`
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (): void => {
            this.popoverController.dismiss()
          }
        },
        {
          text: `Set ${this.delegateeLabel}`,
          handler: ({ delegateeAddress }: { delegateeAddress: string }): boolean => {
            this.popoverController.dismiss({ delegateeAddress })

            return true
          }
        }
      ]
    }
  }

  // temporary
  private async createTezosAlertOptions(): Promise<AlertOptions> {
    return this.languageService.getTranslatedAlert(
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
            this.popoverController.dismiss()
          }
        },
        {
          text: 'delegate-edit-popover.set-baker_label',
          handler: ({ bakerAddress }: { bakerAddress: string }): boolean => {
            this.popoverController.dismiss({ bakerAddress })

            return true
          }
        }
      ]
    )
  }

  public async changeDelegateeToAirGap() {
    this.popoverController.dismiss({ changeToAirGap: true })
  }
}
