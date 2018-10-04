import { NgModule } from '@angular/core'

import { AmountConverterPipe } from './amount-converter/amount-converter.pipe'
import { FeeConverterPipe } from './fee-converter/fee-converter.pipe'
import { ShortenStringPipe } from './shorten-string/shorten-string.pipe'
import { CryptoToFiatPipe } from './crypto-to-fiat/crypto-to-fiat.pipe'

@NgModule({
  declarations: [AmountConverterPipe, FeeConverterPipe, ShortenStringPipe, CryptoToFiatPipe],
  imports: [],
  exports: [AmountConverterPipe, FeeConverterPipe, ShortenStringPipe, CryptoToFiatPipe]
})
export class PipesModule {}
