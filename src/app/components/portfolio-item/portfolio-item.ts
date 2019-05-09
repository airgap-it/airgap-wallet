import { Component, Input } from '@angular/core'
import { AirGapMarketWallet } from 'airgap-coin-lib'
import { OperationsProvider } from '../../services/operations/operations'
import { WebExtensionProvider } from '../../services/web-extension/web-extension'
import { AccountProvider } from '../../services/account/account.provider'
import { Observable } from 'rxjs'
import { ProtocolSymbols } from '../../services/protocols/protocols'

@Component({
  selector: 'portfolio-item',
  templateUrl: 'portfolio-item.html',
  styleUrls: ['./portfolio-item.scss']
})
export class PortfolioItemComponent {
  public isActive: boolean = false

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
  hideFiatAmounts: boolean = false

  @Input()
  isToken: boolean = false

  @Input()
  isDelegated: Observable<boolean>

  constructor(
    private readonly operationsProvider: OperationsProvider,
    public webExtensionProvider: WebExtensionProvider,
    public accountProvider: AccountProvider
  ) {}

  ngOnInit(): void {
    if (this.webExtensionProvider.isWebExtension()) {
      this.accountProvider.activeAccountSubject.subscribe(activeAccount => {
        if (this.wallet && activeAccount) {
          this.isActive = this.accountProvider.isSameWallet(this.wallet, activeAccount)
        }
      })
    }
  }

  async ngOnChanges() {
    if (this.wallet && this.wallet.protocolIdentifier === ProtocolSymbols.XTZ_KT) {
      this.isDelegated = await this.operationsProvider.getDelegationStatusObservableOfAddress(this.wallet.receivingPublicAddress)
    }
  }
}
