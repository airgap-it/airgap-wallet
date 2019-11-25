import { Component, Input } from '@angular/core'
import { IAirGapTransaction } from 'airgap-coin-lib'

import { Transaction } from '../../models/transaction.model'

@Component({
  selector: 'from-to',
  templateUrl: 'from-to.html',
  styleUrls: ['./from-to.scss']
})
export class FromToComponent {
  @Input()
  public transaction: Transaction | IAirGapTransaction

  public displayRawData: boolean = false
}
