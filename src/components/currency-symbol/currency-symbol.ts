import { Component, Input } from '@angular/core'

@Component({
  selector: 'currency-symbol',
  templateUrl: 'currency-symbol.html'
})
export class CurrencySymbolComponent {
  @Input()
  private symbol: string

  public symbolURL: string = ''

  constructor() {
    /* */
  }

  ngAfterViewInit() {
    this.symbolURL = 'assets/symbols/' + this.symbol.toLowerCase() + '.svg'
  }

  errorHandler() {
    this.symbolURL = 'assets/symbols/btc.svg' // TODO: fallback image
  }
}
