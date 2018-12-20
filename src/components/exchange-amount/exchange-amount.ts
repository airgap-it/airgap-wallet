import { Component } from '@angular/core'

@Component({
  selector: 'exchange-amount',
  templateUrl: 'exchange-amount.html'
})
export class ExchangeAmountComponent {
  text: string

  constructor() {
    console.log('Hello ExchangeAmountComponent Component')
    this.text = 'Hello World'
  }
}
