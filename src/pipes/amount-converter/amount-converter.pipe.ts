import { PipeTransform, Pipe } from '@angular/core'
import { BigNumber } from 'bignumber.js'
import { getProtocolByIdentifier } from 'airgap-coin-lib'

@Pipe({
  name: 'amountConverter'
})
export class AmountConverterPipe implements PipeTransform {
  transform(value: string, args: { protocolIdentifier: string }): any {
    if (!args.protocolIdentifier || value === undefined || isNaN(Number(value))) {
      console.warn(`AmountConverterPipe: necessary properties missing!\n` + `Protocol: ${args.protocolIdentifier}\n` + `Value: ${value}`)
      return ''
    }

    const protocol = getProtocolByIdentifier(args.protocolIdentifier)
    if (!protocol) {
      return
    }

    return new BigNumber(value).shiftedBy(-1 * protocol.decimals).toFixed() + ' ' + protocol.symbol.toUpperCase()
  }
}
