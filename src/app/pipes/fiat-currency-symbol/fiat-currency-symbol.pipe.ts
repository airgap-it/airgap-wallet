import { Pipe, PipeTransform } from '@angular/core'
import { CurrencyService } from '../../services/currency/currency.service'

@Pipe({
  name: 'fiatCurrencySymbol',
  pure: false
})
export class FiatCurrencySymbolPipe implements PipeTransform {
  public constructor(private readonly currencyService: CurrencyService) {}

  public transform(_value?: unknown): string {
    return this.currencyService.getCurrencySymbol()
  }
}
