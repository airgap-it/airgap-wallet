import { Component, Input } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Component({
  selector: 'portfolio-item',
  templateUrl: 'portfolio-item.html'
})
export class PortfolioItemComponent {
  @Input()
  wallet: AirGapMarketWallet

  @Input()
  maxDigits: number = 0

  @Input()
  showBalances: boolean = true

  @Input()
  isExpendable: boolean = false

  @Input()
  isExtended: boolean = false

  @Input()
  isToken: boolean = false
}
