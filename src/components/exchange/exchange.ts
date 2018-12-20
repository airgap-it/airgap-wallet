import { Component } from '@angular/core'

@Component({
  selector: 'exchange',
  templateUrl: 'exchange.html'
})
export class ExchangeComponent {
  text: string

  constructor() {
    console.log('Hello ExchangeComponent Component')
    this.text = 'Hello World'
  }
}
