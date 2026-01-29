import { NgModule } from '@angular/core'

import { CryptoToFiatPipe } from './crypto-to-fiat/crypto-to-fiat.pipe'
import { FiatCurrencySymbolPipe } from './fiat-currency-symbol/fiat-currency-symbol.pipe'
import { GroupLabelPipe } from './group-label/group-label.pipe'
import { PercentagePipe } from './percentage/percentage.pipe'
import { ShortenStringPipe } from './shorten-string/shorten-string.pipe'
import { TruncateStringPipe } from './truncate-string/truncate-string.pipe'

@NgModule({
  declarations: [ShortenStringPipe, CryptoToFiatPipe, PercentagePipe, GroupLabelPipe, TruncateStringPipe, FiatCurrencySymbolPipe],
  imports: [],
  exports: [ShortenStringPipe, CryptoToFiatPipe, PercentagePipe, GroupLabelPipe, TruncateStringPipe, FiatCurrencySymbolPipe]
})
export class PipesModule {}
