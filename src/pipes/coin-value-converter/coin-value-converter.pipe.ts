import { Pipe, PipeTransform } from '@angular/core'
import { BigNumber } from 'bignumber.js'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

@Pipe({
  name: 'coinValueConverter'
})

export class CoinValueConverterPipe implements PipeTransform {
  transform(value: string, args: { protocolIdentifier: string, price: number }): any {
    if (!args.price || !args.protocolIdentifier || value === undefined) {
      console.error('CoinValueConverterPipe: necessary properties missing!')
      return ''
    }

    const protocol = getProtocolByIdentifier(args.protocolIdentifier)
    const pricePerCoin = new BigNumber(args.price)
    const pricePerFeeUnit = pricePerCoin.shiftedBy(-1 * protocol.feeDecimals)

    switch (protocol.symbol) {
      case 'btc':
        return new BigNumber(value).times(pricePerFeeUnit).toNumber()
      case 'eth':
        return new BigNumber(value).times(pricePerFeeUnit).toNumber()
      default:
        return new BigNumber(value).times(args.price)
    }
  }
}
