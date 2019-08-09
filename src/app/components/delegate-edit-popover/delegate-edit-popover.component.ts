import { Component } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'

import { LanguageService } from '../../services/language.service'

@Component({
  selector: 'app-delegate-edit-popover',
  templateUrl: './delegate-edit-popover.component.html',
  styleUrls: ['./delegate-edit-popover.component.scss']
})
export class DelegateEditPopoverComponent {
  public hideAirGap: boolean

  constructor(
    private readonly alertController: AlertController,
    private readonly popoverController: PopoverController,
    private readonly languageService: LanguageService,
    private readonly navParams: NavParams
  ) {
    this.hideAirGap = this.navParams.get('hideAirGap')
  }

  public async changeBaker(): Promise<void> {
    const translatedAlert = await this.languageService.getTranslatedAlert(
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
    const alert: HTMLIonAlertElement = await this.alertController.create(translatedAlert)

    await alert.present()
  }

  public async changeBakerToAirGap() {
    this.popoverController.dismiss({ changeToAirGap: true })
  }
}
