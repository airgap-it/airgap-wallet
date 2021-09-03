import { UiEventService } from '@airgap/angular-core'
import { P2PPairingRequest } from '@airgap/beacon-sdk'
import { Component, OnInit } from '@angular/core'
import { BeaconService } from 'src/app/services/beacon/beacon.service'

@Component({
  selector: 'dapp-settings',
  templateUrl: './dapp-settings.page.html',
  styleUrls: ['./dapp-settings.page.scss']
})
export class DappSettingsPage implements OnInit {
  public connectedPeers: P2PPairingRequest[] = []
  public connectedServer: string = ''

  constructor(private readonly beaconService: BeaconService, private readonly uiEventService: UiEventService) {}

  public async ngOnInit(): Promise<void> {
    await this.loadPeers()
  }

  public async loadPeers(): Promise<void> {
    this.connectedPeers = await this.beaconService.getPeers()
    this.connectedServer = await this.beaconService.getConnectedServer()
  }

  public async removePeer(peer: P2PPairingRequest): Promise<void> {
    await this.beaconService.removePeer(peer)
    await this.loadPeers()
  }

  public async removeAllPeers(): Promise<void> {
    this.uiEventService.showTranslatedAlert({
      header: 'dapp-settings.alert.heading',
      message: 'dapp-settings.alert.message',
      buttons: [
        {
          text: 'dapp-settings.alert.cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (): void => {}
        },
        {
          text: 'dapp-settings.alert.confirm',
          handler: async (): Promise<void> => {
            await this.beaconService.removeAllPeers()
            await this.loadPeers()
          }
        }
      ]
    })
  }

  public async reset(): Promise<void> {
    await this.beaconService.reset()
    await this.loadPeers()
  }
}
