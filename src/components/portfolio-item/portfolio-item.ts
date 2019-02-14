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
}
