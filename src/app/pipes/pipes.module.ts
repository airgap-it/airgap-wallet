import { NgModule } from '@angular/core'

import { AmountConverterPipe } from './amount-converter/amount-converter.pipe'
import { CryptoToFiatPipe } from './crypto-to-fiat/crypto-to-fiat.pipe'
import { FeeConverterPipe } from './fee-converter/fee-converter.pipe'
import { ShortenStringPipe } from './shorten-string/shorten-string.pipe'
import { PercentagePipe } from './percentage/percentage.pipe'

@NgModule({
  declarations: [AmountConverterPipe, FeeConverterPipe, ShortenStringPipe, CryptoToFiatPipe, PercentagePipe],
  imports: [],
  exports: [AmountConverterPipe, FeeConverterPipe, ShortenStringPipe, CryptoToFiatPipe, PercentagePipe]
})
export class PipesModule {}
