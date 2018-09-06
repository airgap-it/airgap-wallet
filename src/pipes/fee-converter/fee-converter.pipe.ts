import { Pipe, PipeTransform } from '@angular/core'
import { BigNumber } from 'bignumber.js'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

@Pipe({
  name: 'feeConverter'
})

export class FeeConverterPipe implements PipeTransform {
  transform(value: string, args: { protocolIdentifier: string }): any {
    if (!args.protocolIdentifier || value === undefined) {
      console.error('AmountConverterPipe: necessary properties missing!')
      return ''
    }

    return new BigNumber(value).shiftedBy(-1 * (getProtocolByIdentifier(args.protocolIdentifier).feeDecimals)).toFixed() + ' ' + getProtocolByIdentifier(args.protocolIdentifier).feeSymbol.toUpperCase()
  }
}
