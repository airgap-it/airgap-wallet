import { Pipe, PipeTransform } from '@angular/core'
import { BigNumber } from 'bignumber.js'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

@Pipe({
  name: 'feeConverter'
})
export class FeeConverterPipe implements PipeTransform {
  transform(value: string, args: { protocolIdentifier: string }): any {
    if (!args.protocolIdentifier || value === undefined || isNaN(Number(value))) {
      console.warn(`FeeConverterPipe: necessary properties missing!\n` + `Protocol: ${args.protocolIdentifier}\n` + `Value: ${value}`)
      return ''
    }

    const protocol = getProtocolByIdentifier(args.protocolIdentifier)
    if (!protocol) {
      return ''
    }

    return new BigNumber(value).shiftedBy(-1 * protocol.feeDecimals).toFixed() + ' ' + protocol.feeSymbol.toUpperCase()
  }
}
