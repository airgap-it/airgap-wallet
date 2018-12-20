import { Component } from '@angular/core'

@Component({
  selector: 'exchange-select-wallet',
  templateUrl: 'exchange-select-wallet.html'
})
export class ExchangeSelectWalletComponent {
  text: string

  constructor() {
    console.log('Hello ExchangeSelectWalletComponent Component')
    this.text = 'Hello World'
  }
}
