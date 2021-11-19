import { ProtocolService } from '@airgap/angular-core'
import { Component, Input, OnInit } from '@angular/core'
import { IAirGapTransaction, ICoinProtocol } from '@airgap/coinlib-core'

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

  constructor(private readonly protocolService: ProtocolService) { }

  public async ngOnInit(): Promise<void> {
    try {
      this.protocol = await this.protocolService.getProtocol(this.tx.protocolIdentifier, this.tx.network)
    } catch {

    }
  }
}
