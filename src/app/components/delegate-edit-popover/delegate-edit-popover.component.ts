import { Component } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'

import { LanguageService } from '../../services/language/language.service'

@Component({
  selector: 'app-delegate-edit-popover',
  templateUrl: './delegate-edit-popover.component.html',
  styleUrls: ['./delegate-edit-popover.component.scss']
})
export class DelegateEditPopoverComponent {
  public readonly hideAirGap: boolean
  public readonly delegateeLabel: string

  constructor(
    private readonly alertController: AlertController,
    private readonly popoverController: PopoverController,
    private readonly languageService: LanguageService,
    private readonly navParams: NavParams
  ) {
    this.hideAirGap = this.navParams.get('hideAirGap')
    this.delegateeLabel = this.navParams.get('delegateeLabel')
  }

  public async changeDelegatee(): Promise<void> {
    const translatedAlert = await this.languageService.getTranslatedAlert(
      'delegate-edit-popover.heading',
      'delegate-edit-popover.text',
      [
        {
          name: 'delegateeAddress',
          id: 'delegatee-address',
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
          handler: ({ delegateeAddress }: { delegateeAddress: string }): boolean => {
            this.popoverController.dismiss({ delegateeAddress })

            return true
          }
        }
      ]
    )
    const alert: HTMLIonAlertElement = await this.alertController.create(translatedAlert)

    await alert.present()
  }

  public async changeDelegateeToAirGap() {
    this.popoverController.dismiss({ changeToAirGap: true })
  }
}
