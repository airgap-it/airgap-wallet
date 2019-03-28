import { Component, Input } from '@angular/core'
import { ICoinProtocol } from 'airgap-coin-lib'

@Component({
  selector: 'currency-item',
  templateUrl: 'currency-item.html'
})
export class CurrencyItemComponent {
  @Input()
  public isSelected: boolean

  @Input()
  public protocol: ICoinProtocol

  @Input()
  public radioList: boolean = false
}
