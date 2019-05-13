import { Component, Input } from '@angular/core'

@Component({
  selector: 'currency-symbol',
  templateUrl: 'currency-symbol.html'
})
export class CurrencySymbolComponent {
  @Input()
  private readonly symbol: string

  public symbolURL: string = 'assets/symbols/generic-coin.svg'

  constructor() {
    /* */
  }

  public ngAfterViewInit() {
    this.loadImage()
  }

  public ngOnChanges() {
    this.loadImage()
  }

  public loadImage() {
    const imageUrl = 'assets/symbols/' + this.symbol.toLowerCase() + '.svg'
    const img = new Image()
    img.onload = () => {
      this.symbolURL = imageUrl
    }
    img.src = imageUrl
  }
}
