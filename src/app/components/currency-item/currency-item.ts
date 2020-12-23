import { Component, Input } from '@angular/core'
import { ICoinProtocol } from '@airgap/coinlib-core'

@Component({
  selector: 'currency-item',
  templateUrl: 'currency-item.html',
  styleUrls: ['./currency-item.scss']
})
export class CurrencyItemComponent {
  @Input()
  public protocol: ICoinProtocol

  @Input()
  public radioList: boolean = false
}
