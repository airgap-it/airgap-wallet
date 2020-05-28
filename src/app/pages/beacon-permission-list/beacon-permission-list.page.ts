import { PermissionInfo } from '@airgap/beacon-sdk'
import { Component } from '@angular/core'
import { AlertController } from '@ionic/angular'
import { BeaconService } from 'src/app/services/beacon/beacon.service'

@Component({
  selector: 'app-beacon-permission-list',
  templateUrl: './beacon-permission-list.page.html',
  styleUrls: ['./beacon-permission-list.page.scss']
})
export class BeaconPermissionListPage {
  public permissions: PermissionInfo[] = []

  constructor(private readonly beaconService: BeaconService, private readonly alertController: AlertController) {
    this.loadPermissions().catch(console.error)
  }

  public async loadPermissions(): Promise<void> {
    this.permissions = await this.beaconService.client.getPermissions()
  }

  public async deletePermission(permission: PermissionInfo): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertController.create({
      header: 'Delete Permission?',
      message:
        'Are you sure you want to delete this permission? The DApp will not be able to perform operations anymore until new permissions are granted.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Yes',
          handler: async (): Promise<void> => {
            await this.beaconService.client.removePermission(permission.accountIdentifier)
            await this.loadPermissions()
          }
        }
      ]
    })

    await alert.present()
  }
}
