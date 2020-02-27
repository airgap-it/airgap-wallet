import { Component, Input } from '@angular/core'
import { IAirGapTransaction, AirGapMarketWallet } from 'airgap-coin-lib'
import { PendingExchangeTransaction } from 'src/app/services/exchange/exchange'
import { Platform } from '@ionic/angular'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { Router } from '@angular/router'
import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
declare let cordova

@Component({
  selector: 'transaction-item',
  templateUrl: './transaction-item.component.html',
  styleUrls: ['./transaction-item.component.scss']
})
export class TransactionItemComponent {
  constructor(private readonly platform: Platform, public readonly dataService: DataService, public readonly router: Router) {}

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
  public openTransactionDetailPage(transaction: IAirGapTransaction): void {
    this.dataService.setData(DataServiceKey.DETAIL, transaction)
    this.router.navigateByUrl('/transaction-detail/' + DataServiceKey.DETAIL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
