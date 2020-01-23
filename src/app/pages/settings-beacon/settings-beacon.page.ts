import { Component, OnInit } from '@angular/core'
import { BeaconService } from 'src/app/services/beacon/beacon.service'

@Component({
  selector: 'settings-beacon',
  templateUrl: './settings-beacon.page.html',
  styleUrls: ['./settings-beacon.page.scss']
})
export class SettingsBeaconPage implements OnInit {
  public connectedPeers: any[] = []

  constructor(private readonly beaconService: BeaconService) {}

  async ngOnInit() {
    this.loadPeers()
  }

  async loadPeers() {
    this.connectedPeers = await this.beaconService.getPeers()
  }

  async removePeer(peer: any) {
    console.log('peer', peer)
    await this.beaconService.removePeer(peer)
    await this.loadPeers()
  }

  async removeAllPeers() {
    await this.beaconService.removeAllPeers()
    await this.loadPeers()
  }
}
