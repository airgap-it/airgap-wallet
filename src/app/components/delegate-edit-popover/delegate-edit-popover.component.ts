import { AddressService } from '@airgap/angular-core'
import { ProtocolSymbols } from '@airgap/coinlib-core'
import { Component } from '@angular/core'
import { AlertController, NavParams, PopoverController } from '@ionic/angular'
import { AlertOptions } from '@ionic/core'
import { TranslateService } from '@ngx-translate/core'

@Component({
  selector: 'app-delegate-edit-popover',
  templateUrl: './delegate-edit-popover.component.html',
  styleUrls: ['./delegate-edit-popover.component.scss']
})
export class DelegateEditPopoverComponent {
  public readonly delegateeLabel: string
  public readonly delegateeLabelPlural: string

  private readonly protocolIdentifier: ProtocolSymbols
  private readonly networkIdentifier: string

  constructor(
    private readonly alertController: AlertController,
    private readonly popoverController: PopoverController,
    private readonly navParams: NavParams,
    private readonly translateService: TranslateService,
    private readonly addressService: AddressService
  ) {
    const delegateeLabel: string | undefined = this.navParams.get('delegateeLabel')
    const delegateeLabelPlural: string | undefined = this.navParams.get('delegateeLabelPlural')

    this.protocolIdentifier = this.navParams.get('protocolIdentifier')
    this.networkIdentifier = this.navParams.get('network')

    this.delegateeLabel = delegateeLabel !== undefined ? delegateeLabel : 'delegation-detail.default-delegatee-label'
    this.delegateeLabelPlural =
      delegateeLabelPlural !== undefined ? delegateeLabelPlural : 'delegation-detail.default-delegatee-label-plural'
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
          name: 'delegatee',
          id: 'delegatee',
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
          handler: async ({ delegatee }: { delegatee: string }): Promise<boolean> => {
            const delegateeAddress: string | undefined = await this.addressService.getAddress(
              delegatee,
              this.protocolIdentifier,
              this.networkIdentifier
            )

            this.popoverController.dismiss({ delegateeAddress: delegateeAddress ? delegateeAddress : '' })

            return true
          }
        }
      ]
    }
  }
}
