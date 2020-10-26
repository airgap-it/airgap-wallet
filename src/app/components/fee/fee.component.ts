import { Component, Input } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Component({
  selector: 'fee',
  templateUrl: './fee.component.html',
  styleUrls: ['./fee.component.scss']
})
export class FeeComponent {
  @Input()
  public wallet: AirGapMarketWallet

  @Input()
  public state: any

  @Input()
  public form: FormGroup

  constructor() {}
}
