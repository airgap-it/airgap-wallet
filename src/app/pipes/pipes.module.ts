import { NgModule } from '@angular/core'

import { CryptoToFiatPipe } from './crypto-to-fiat/crypto-to-fiat.pipe'
import { PercentagePipe } from './percentage/percentage.pipe'
import { ShortenStringPipe } from './shorten-string/shorten-string.pipe'

@NgModule({
  declarations: [ShortenStringPipe, CryptoToFiatPipe, PercentagePipe],
  imports: [],
  exports: [ShortenStringPipe, CryptoToFiatPipe, PercentagePipe]
})
export class PipesModule {}
