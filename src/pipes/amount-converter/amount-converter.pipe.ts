import { PipeTransform, Pipe } from '@angular/core'
import { BigNumber } from 'bignumber.js'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

@Pipe({
  name: 'amountConverter'
})

export class AmountConverterPipe implements PipeTransform {
  transform(value: string, args: { protocolIdentifier: string }): any {
    if (!args.protocolIdentifier || value === undefined) {
      console.error('AmountConverterPipe: necessary properties missing!')
      return ''
    }

    return new BigNumber(value).shiftedBy(-1 * (getProtocolByIdentifier(args.protocolIdentifier).decimals)).toFixed() + ' ' + getProtocolByIdentifier(args.protocolIdentifier).symbol.toUpperCase()
  }
}
