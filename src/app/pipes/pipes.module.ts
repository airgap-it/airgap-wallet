import { NgModule } from '@angular/core'

import { CryptoToFiatPipe } from './crypto-to-fiat/crypto-to-fiat.pipe'
import { GroupLabelPipe } from './group-label/group-label.pipe'
import { PercentagePipe } from './percentage/percentage.pipe'
import { ShortenStringPipe } from './shorten-string/shorten-string.pipe'
import { TruncateStringPipe } from './truncate-string/truncate-string.pipe'

@NgModule({
  declarations: [ShortenStringPipe, CryptoToFiatPipe, PercentagePipe, GroupLabelPipe, TruncateStringPipe],
  imports: [],
  exports: [ShortenStringPipe, CryptoToFiatPipe, PercentagePipe, GroupLabelPipe, TruncateStringPipe]
})
export class PipesModule {}
