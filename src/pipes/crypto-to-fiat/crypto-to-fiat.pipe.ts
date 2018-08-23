import { PipeTransform, Pipe } from '@angular/core'
import { BigNumber } from 'bignumber.js'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

@Pipe({
  name: 'cryptoToFiat'
})

export class CryptoToFiatPipe implements PipeTransform {
  transform(value: BigNumber, args: { protocolIdentifier: string, currentMarketPrice: BigNumber }): any {
    if (!args.currentMarketPrice || !args.protocolIdentifier || !value) {
      console.error('CryptoToFiatPipe: necessary properties missing!')
      return ''
    }

    let fiatValue = args.currentMarketPrice.multipliedBy(value.shiftedBy(-1 * (getProtocolByIdentifier(args.protocolIdentifier).decimals)))
    return fiatValue.toFixed()
  }
}
