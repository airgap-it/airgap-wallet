import { AppMetadata } from '@airgap/beacon-sdk'
import { Component, EventEmitter, Input, Output } from '@angular/core'

@Component({
  selector: 'dapp-peer',
  templateUrl: './dapp-peer.component.html',
  styleUrls: ['./dapp-peer.component.scss']
})
export class DappPeerComponent {
  @Output()
  public readonly removePeerEmitter: EventEmitter<AppMetadata> = new EventEmitter<AppMetadata>()

  @Input()
  public peer: AppMetadata | undefined

  public remove() {
    this.removePeerEmitter.emit(this.peer)
  }
}
