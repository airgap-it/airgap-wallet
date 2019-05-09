import { Component, Input } from '@angular/core'

@Component({
  selector: 'address-row',
  templateUrl: 'address-row.html',
  styleUrls: ['./address-row.scss']
})
export class AddressRowComponent {
  @Input()
  public label: string

  @Input()
  public address: string

  @Input()
  public symbol: string

  @Input()
  public hasSymbol: boolean = false
}
