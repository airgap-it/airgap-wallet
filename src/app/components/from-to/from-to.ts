import { Component, Input } from '@angular/core'
import { IAirGapTransaction } from 'airgap-coin-lib'

@Component({
  selector: 'from-to',
  templateUrl: 'from-to.html',
  styleUrls: ['./from-to.scss']
})
export class FromToComponent {
  @Input()
  public transaction: IAirGapTransaction

  public displayRawData: boolean = false
}
