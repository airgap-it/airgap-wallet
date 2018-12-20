import { Component } from '@angular/core'

@Component({
  selector: 'exchange-select-coin',
  templateUrl: 'exchange-select-coin.html'
})
export class ExchangeSelectCoinComponent {
  text: string

  constructor() {
    console.log('Hello ExchangeSelectCoinComponent Component')
    this.text = 'Hello World'
  }
}
