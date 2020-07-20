import { Component, Input, OnInit } from '@angular/core'
import { IAirGapTransaction, ICoinProtocol, getProtocolByIdentifier } from 'airgap-coin-lib'

@Component({
  selector: 'transaction-item',
  templateUrl: './transaction-item.component.html',
  styleUrls: ['./transaction-item.component.scss']
})
export class TransactionItemComponent implements OnInit {
  @Input()
  public tx: IAirGapTransaction

  @Input()
  public transactionType: string

  public protocol: ICoinProtocol | undefined

  public ngOnInit(): void {
    try {
      this.protocol = getProtocolByIdentifier(this.tx.protocolIdentifier)
    } catch {}
  }
}
