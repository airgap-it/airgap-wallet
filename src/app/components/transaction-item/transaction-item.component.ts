import { Component, Input } from '@angular/core'
import { IAirGapTransaction, AirGapMarketWallet } from 'airgap-coin-lib'
import { PendingExchangeTransaction } from 'src/app/services/exchange/exchange'
import { Platform } from '@ionic/angular'
declare let cordova

@Component({
  selector: 'transaction-item',
  templateUrl: './transaction-item.component.html',
  styleUrls: ['./transaction-item.component.scss']
})
export class TransactionItemComponent {
  constructor(private readonly platform: Platform) {}

  @Input()
  public pendingTransactions: IAirGapTransaction[] = []

  @Input()
  public pendingExchangeTransactions: PendingExchangeTransaction[] = []

  @Input()
  public protocolIdentifier: string

  @Input()
  public isRefreshing: boolean = false

  @Input()
  public hasPendingTransactions: boolean = false

  @Input()
  public initialTransactionsLoaded: boolean = false

  @Input()
  public wallet: AirGapMarketWallet

  public openBlockexplorer(): void {
    const blockexplorer = this.wallet.coinProtocol.getBlockExplorerLinkForAddress(this.wallet.addresses[0])

    this.openUrl(blockexplorer)
  }

  private openUrl(url: string): void {
    if (this.platform.is('ios') || this.platform.is('android')) {
      cordova.InAppBrowser.open(url, '_system', 'location=true')
    } else {
      window.open(url, '_blank')
    }
  }
}
