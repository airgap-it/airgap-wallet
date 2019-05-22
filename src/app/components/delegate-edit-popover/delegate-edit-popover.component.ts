import { Component } from '@angular/core'
import { AlertController, PopoverController } from '@ionic/angular'
import { LanguageService } from 'src/app/services/language.service'

@Component({
  selector: 'app-delegate-edit-popover',
  templateUrl: './delegate-edit-popover.component.html',
  styleUrls: ['./delegate-edit-popover.component.scss']
})
export class DelegateEditPopoverComponent {
  constructor(
    private readonly alertController: AlertController,
    private readonly popoverController: PopoverController,
    private readonly languageService: LanguageService
  ) {}

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
}
