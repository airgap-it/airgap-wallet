import { ICoinProtocol } from '@airgap/coinlib-core'
import { Component, Input, OnInit } from '@angular/core'

interface ProtocolInfo {
  name: string
  identifier: string
  symbol: string
}

@Component({
  selector: 'currency-item-label',
  templateUrl: 'currency-item-label.html',
  styleUrls: ['./currency-item-label.scss']
})
export class CurrencyItemLabelComponent implements OnInit {
  @Input()
  public protocol: ICoinProtocol | ProtocolInfo

  @Input()
  public showSymbol: boolean = true

  @Input()
  public parentName: string

  public ngOnInit(): void {
    if (this.parentName === undefined && this.protocol) {
      const index = this.protocol.identifier.lastIndexOf('-')
      const identifiers = [this.protocol.identifier.substring(0, index), this.protocol.identifier.substring(index + 1)]
      this.parentName = index !== -1 ? identifiers[0] : this.protocol.identifier
    }
  }
}
