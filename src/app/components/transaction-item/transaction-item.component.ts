import { FormattedExchangeTransaction } from './../../services/exchange/exchange'
import { Component, Input } from '@angular/core'
import { IAirGapTransaction } from 'airgap-coin-lib'

@Component({
  selector: 'transaction-item',
  templateUrl: './transaction-item.component.html',
  styleUrls: ['./transaction-item.component.scss']
})
export class TransactionItemComponent {
  constructor() {}

  @Input()
  public tx: IAirGapTransaction | FormattedExchangeTransaction

  @Input()
  public transactionType: string
}
