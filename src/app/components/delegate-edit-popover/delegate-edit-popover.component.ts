import { Component } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'
import { AlertOptions } from '@ionic/angular/node_modules/@ionic/core'
import { AirGapDelegatorAction } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'

@Component({
  selector: 'app-delegate-edit-popover',
  templateUrl: './delegate-edit-popover.component.html',
  styleUrls: ['./delegate-edit-popover.component.scss']
})
export class DelegateEditPopoverComponent {
  public readonly hideAirGap: boolean
  public readonly delegateeLabel: string
  public readonly hasMultipleDelegatees: boolean
  public readonly secondaryDelegatorActions: AirGapDelegatorAction[]

  constructor(
    private readonly alertController: AlertController,
    private readonly popoverController: PopoverController,
    private readonly navParams: NavParams
  ) {
    this.hideAirGap = this.navParams.get('hideAirGap')
    this.delegateeLabel = this.navParams.get('delegateeLabel')
    this.hasMultipleDelegatees = this.navParams.get('hasMultipleDelegatees')
    this.secondaryDelegatorActions = this.navParams.get('secondaryDelegatorActions')
  }

  public async changeDelegatee(): Promise<void> {
    const alertOptions = await this.createAlertOptions()
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

  public async changeDelegateeToAirGap() {
    this.popoverController.dismiss({ changeToAirGap: true })
  }

  public async showAllDelegatees() {
    this.popoverController.dismiss({ showDelegateeList: true })
  }

  public async callSecondaryAction(type: string) {
    this.popoverController.dismiss({ secondaryActionType: type })
  }
}
