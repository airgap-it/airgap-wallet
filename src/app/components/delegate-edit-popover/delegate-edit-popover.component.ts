import { Component } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'
import { AlertOptions } from '@ionic/angular/node_modules/@ionic/core'
import { AirGapDelegatorAction } from 'src/app/interfaces/IAirGapCoinDelegateProtocol'
import { TranslateService } from '@ngx-translate/core'

@Component({
  selector: 'app-delegate-edit-popover',
  templateUrl: './delegate-edit-popover.component.html',
  styleUrls: ['./delegate-edit-popover.component.scss']
})
export class DelegateEditPopoverComponent {
  public readonly hideAirGap: boolean
  public readonly delegateeLabel: string
  public readonly delegateeLabelPlural: string
  public readonly hasMultipleDelegatees: boolean
  public readonly secondaryDelegatorActions: AirGapDelegatorAction[]

  constructor(
    private readonly alertController: AlertController,
    private readonly popoverController: PopoverController,
    private readonly navParams: NavParams,
    private readonly translateService: TranslateService
  ) {
    this.hideAirGap = this.navParams.get('hideAirGap')
    this.delegateeLabel = this.navParams.get('delegateeLabel')
    this.delegateeLabelPlural = this.navParams.get('delegateeLabelPlural')
    this.hasMultipleDelegatees = this.navParams.get('hasMultipleDelegatees')
    this.secondaryDelegatorActions = this.navParams.get('secondaryDelegatorActions')
  }

  public async changeDelegatee(): Promise<void> {
    const alertOptions = await this.createAlertOptions()
    const alert: HTMLIonAlertElement = await this.alertController.create(alertOptions)

    await alert.present()
  }

  private async createAlertOptions(): Promise<AlertOptions> {
    return {
      header: this.translateService.instant('delegate-edit-popover.delegation-settings_label'),
      message: this.translateService.instant('delegate-edit-popover.change-alert.text', {
        delegateeLabel: this.translateService.instant(this.delegateeLabel)
      }),
      inputs: [
        {
          name: 'delegateeAddress',
          id: 'delegatee-address',
          placeholder: this.translateService.instant('delegate-edit-popover.change-alert.placeholder_text', {
            delegateeLabel: this.translateService.instant(this.delegateeLabel)
          })
        }
      ],
      buttons: [
        {
          text: this.translateService.instant('delegate-edit-popover.change-alert.cancel_label'),
          role: 'cancel',
          cssClass: 'secondary',
          handler: (): void => {
            this.popoverController.dismiss()
          }
        },
        {
          text: this.translateService.instant('delegate-edit-popover.change-alert.set-delegatee_label', {
            delegateeLabel: this.translateService.instant(this.delegateeLabel)
          }),
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
