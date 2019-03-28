import { Component, Input } from '@angular/core'

@Component({
  selector: 'currency-item',
  templateUrl: 'currency-item.html'
})
export class CurrencyItemComponent {
  @Input()
  public protocolSymbol: string

  @Input()
  public protocolName: string

  @Input()
  public radioList: boolean = false
}
