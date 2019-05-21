import { Component } from '@angular/core'
import { AlertController, PopoverController } from '@ionic/angular'

@Component({
  selector: 'app-delegate-edit-popover',
  templateUrl: './delegate-edit-popover.component.html',
  styleUrls: ['./delegate-edit-popover.component.scss']
})
export class DelegateEditPopoverComponent {
  constructor(private readonly alertController: AlertController, private readonly popoverController: PopoverController) {}

  public async changeBaker(): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertController.create({
      header: 'Enter baker address!',
      subHeader: 'Subtitle',
      message: 'This is an alert message.',
      inputs: [
        {
          name: 'bakerAddress',
          id: 'baker-address',
          placeholder: 'Baker Address'
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
          text: 'Okay',
          handler: ({ bakerAddress }: { bakerAddress: string }): void => {
            this.popoverController.dismiss({ bakerAddress })
          }
        }
      ]
    })

    await alert.present()
  }
}
