import { P2PPairingRequest } from '@airgap/beacon-sdk'
import { Component, OnInit } from '@angular/core'
import { BeaconService } from 'src/app/services/beacon/beacon.service'

@Component({
  selector: 'settings-beacon',
  templateUrl: './settings-beacon.page.html',
  styleUrls: ['./settings-beacon.page.scss']
})
export class SettingsBeaconPage implements OnInit {
  public connectedPeers: P2PPairingRequest[] = []
  public connectedServer: string = ''

  constructor(private readonly beaconService: BeaconService) {}

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
    await this.beaconService.removeAllPeers()
    await this.loadPeers()
  }

  public async reset(): Promise<void> {
    await this.beaconService.reset()
    await this.loadPeers()
  }
}
