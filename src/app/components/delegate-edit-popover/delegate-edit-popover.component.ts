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
      /* TODO: use translations */
      header: 'Enter the bakers address',
      message: 'Enter the address provided to you by the baker.',
      inputs: [
        {
          name: 'bakerAddress',
          id: 'baker-address',
          placeholder: 'Baker address'
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
          text: 'Set Baker',
          handler: ({ bakerAddress }: { bakerAddress: string }): boolean => {
            this.popoverController.dismiss({ bakerAddress })

            return true
          }
        }
      ]
    })

    await alert.present()
  }
}
