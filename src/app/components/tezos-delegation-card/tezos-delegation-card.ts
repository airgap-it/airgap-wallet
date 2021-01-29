import { Component, EventEmitter, Input, Output } from '@angular/core'
import { AirGapMarketWallet } from '@airgap/coinlib-core'

@Component({
  selector: 'tezos-delegation-card',
  templateUrl: 'tezos-delegation-card.html'
})
export class TezosDelegationCard {
  @Input()
  public wallet: AirGapMarketWallet

  @Input()
  public isDelegated: boolean = false

  @Input()
  public delegateAmount: number = 0

  @Output()
  public onDelegatedClick: EventEmitter<void> = new EventEmitter<void>()

  @Output()
  public onUndelegatedClick: EventEmitter<void> = new EventEmitter<void>()

  public delegatedClick() {
    this.onDelegatedClick.emit()
  }

  public undelegatedClick() {
    this.onUndelegatedClick.emit()
  }
}
