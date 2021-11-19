import { ICoinProtocol } from '@airgap/coinlib-core'
import { Component, Input } from '@angular/core'

interface ProtocolInfo {
  name: string
  identifier: string
  symbol: string
}

@Component({
  selector: 'currency-item',
  templateUrl: 'currency-item.html',
  styleUrls: ['./currency-item.scss']
})
export class CurrencyItemComponent {
  @Input()
  public protocol: ICoinProtocol | ProtocolInfo

  @Input()
  public radioList: boolean = false

  @Input()
  public showSymbol: boolean = true
}
