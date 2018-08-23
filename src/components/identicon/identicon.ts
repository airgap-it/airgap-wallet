import { Component, Input } from '@angular/core'
import { toDataUrl } from 'ethereum-blockies'

@Component({
  selector: 'identicon',
  templateUrl: 'identicon.html'
})
export class IdenticonComponent {
  public identicon: string = ''

  @Input()
  set address(value: string) {
    if (value) {
      this.identicon = toDataUrl(value.toLowerCase())
    }
  }
}
