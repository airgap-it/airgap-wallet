import { NetworkType, PermissionInfo } from '@airgap/beacon-sdk'
import { Component } from '@angular/core'
import { AlertController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { BeaconService } from 'src/app/services/beacon/beacon.service'

@Component({
  selector: 'app-beacon-permission-list',
  templateUrl: './beacon-permission-list.page.html',
  styleUrls: ['./beacon-permission-list.page.scss']
})
export class BeaconPermissionListPage {
  public networkType: typeof NetworkType = NetworkType

  public permissions: PermissionInfo[] = []

  constructor(
    private readonly beaconService: BeaconService,
    private readonly alertController: AlertController,
    private readonly translate: TranslateService
  ) {
    this.loadPermissions().catch(console.error)
  }

  public async loadPermissions(): Promise<void> {
    this.permissions = await this.beaconService.client.getPermissions()
  }

  public async deletePermission(permission: PermissionInfo): Promise<void> {
    this.translate
      .get([
        'beacon-permission-list.delete-permission-alert.header',
        'beacon-permission-list.delete-permission-alert.message',
        'beacon-permission-list.delete-permission-alert.cancel_label',
        'beacon-permission-list.delete-permission-alert.yes_label'
      ])
      .subscribe(async (translated: { [key: string]: string | undefined }) => {
        const alert: HTMLIonAlertElement = await this.alertController.create({
          header: translated['beacon-permission-list.delete-permission-alert.header'],
          message: translated['beacon-permission-list.delete-permission-alert.message'],
          buttons: [
            {
              text: translated['beacon-permission-list.delete-permission-alert.cancel_label'],
              role: 'cancel',
              cssClass: 'secondary'
            },
            {
              text: translated['beacon-permission-list.delete-permission-alert.yes_label'],
              handler: async (): Promise<void> => {
                await this.beaconService.client.removePermission(permission.accountIdentifier)
                await this.loadPermissions()
              }
            }
          ]
        })

        await alert.present()
      })
  }
}
