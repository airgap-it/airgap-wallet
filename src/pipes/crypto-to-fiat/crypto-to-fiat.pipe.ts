import { PipeTransform, Pipe } from '@angular/core'
import { BigNumber } from 'bignumber.js'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

@Pipe({
  name: 'cryptoToFiat'
})
export class CryptoToFiatPipe implements PipeTransform {
  transform(value: BigNumber, args: { protocolIdentifier: string; currentMarketPrice: BigNumber }): any {
    if (
      !args ||
      !args.currentMarketPrice ||
      !(args.currentMarketPrice instanceof BigNumber) ||
      isNaN(args.currentMarketPrice.toNumber()) ||
      !args.protocolIdentifier ||
      !value ||
      !(value instanceof BigNumber) ||
      isNaN(value.toNumber())
    ) {
      /* console.warn(
        `CryptoToFiatPipe: necessary properties missing!\n` +
          `Market Price: ${args.currentMarketPrice}\n` +
          `Protocol: ${args.protocolIdentifier}\n` +
          `Value: ${value}`
      ) */
      return ''
    }

    const protocol = getProtocolByIdentifier(args.protocolIdentifier)
    if (!protocol) {
      return ''
    }

    let fiatValue = args.currentMarketPrice.multipliedBy(value.shiftedBy(-1 * protocol.decimals))
    return fiatValue.toFixed()
  }
}
