import { Component, Input } from '@angular/core'
import { IAirGapTransaction, AirGapMarketWallet } from '@airgap/coinlib-core'
import { DataService, DataServiceKey } from 'src/app/services/data/data.service'
import { Router } from '@angular/router'
//import { handleErrorSentry, ErrorCategory } from 'src/app/services/sentry-error-handler/sentry-error-handler'
import { BrowserService } from 'src/app/services/browser/browser.service'

@Component({
  selector: 'transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss']
})
export class TransactionListComponent {
  constructor(public readonly dataService: DataService, public readonly router: Router, private readonly browserService: BrowserService) {}

  @Input()
  public transactions: IAirGapTransaction[] = []

  @Input()
  public isRefreshing: boolean = false

  @Input()
  public transactionType: any

  @Input()
  public hasPendingTransactions: boolean = false

  @Input()
  public hasExchangeTransactions: boolean = false

  @Input()
  public initialTransactionsLoaded: boolean = false

  @Input()
  public wallet: AirGapMarketWallet

  public async openBlockexplorer(): Promise<void> {
    const blockexplorer = await this.wallet.protocol.getBlockExplorerLinkForAddress(this.wallet.addresses[0])

    this.browserService.openUrl(blockexplorer)
  }

  public async openTransactionDetailPage(transaction: IAirGapTransaction): Promise<void> {
    this.dataService.setData(DataServiceKey.DETAIL, transaction)
    await this.dataService.set(transaction.hash as DataServiceKey, transaction)
    this.router.navigateByUrl(`/transaction-detail/${DataServiceKey.DETAIL}/${transaction.hash}`).catch(console.error)
    //.catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
