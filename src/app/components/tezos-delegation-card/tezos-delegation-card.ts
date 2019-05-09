import { Input, Component, Output, EventEmitter } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Component({
  selector: 'tezos-delegation-card',
  templateUrl: 'tezos-delegation-card.html'
})
export class TezosDelegationCard {
  @Input()
  wallet: AirGapMarketWallet

  @Input()
  isDelegated: boolean = false

  @Input()
  delegateAmount: number = 0

  @Output()
  onDelegatedClick: EventEmitter<void> = new EventEmitter<void>()

  @Output()
  onUndelegatedClick: EventEmitter<void> = new EventEmitter<void>()

  delegatedClick() {
    this.onDelegatedClick.emit()
  }

  undelegatedClick() {
    this.onUndelegatedClick.emit()
  }
}
