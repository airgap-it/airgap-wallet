import { Component, Input } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { OperationsProvider } from '../../providers/operations/operations'

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
  isToken: boolean = false

  @Input()
  isDelegated: boolean | undefined

  constructor(private readonly operationsProvider: OperationsProvider) {}

  async ngOnChanges() {
    if (this.wallet && this.wallet.protocolIdentifier === 'xtz-kt') {
      const { isDelegated } = await this.operationsProvider.checkDelegated(this.wallet.receivingPublicAddress)
      this.isDelegated = isDelegated
    }
  }
}
