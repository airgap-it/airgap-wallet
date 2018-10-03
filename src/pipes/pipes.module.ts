import { NgModule } from '@angular/core'

import { AmountConverterPipe } from './amount-converter/amount-converter.pipe'
import { CoinValueConverterPipe } from './coin-value-converter/coin-value-converter.pipe'
import { FeeConverterPipe } from './fee-converter/fee-converter.pipe'
import { ShortenStringPipe } from './shorten-string/shorten-string.pipe'
import { CryptoToFiatPipe } from './crypto-to-fiat/crypto-to-fiat.pipe'

@NgModule({
  declarations: [AmountConverterPipe, FeeConverterPipe, ShortenStringPipe, CoinValueConverterPipe, CryptoToFiatPipe],
  imports: [],
  exports: [AmountConverterPipe, FeeConverterPipe, ShortenStringPipe, CoinValueConverterPipe, CryptoToFiatPipe]
})
export class PipesModule {}
