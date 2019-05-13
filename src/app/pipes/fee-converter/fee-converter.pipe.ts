import { Pipe, PipeTransform } from '@angular/core'
import { getProtocolByIdentifier } from 'airgap-coin-lib'
import { BigNumber } from 'bignumber.js'

@Pipe({
  name: 'feeConverter'
})
export class FeeConverterPipe implements PipeTransform {
  public transform(value: BigNumber | string | number, args: { protocolIdentifier: string }): string {
    if (BigNumber.isBigNumber(value)) {
      value = value.toNumber()
    }
    if (!args.protocolIdentifier || (!value && value !== 0) || isNaN(Number(value))) {
      // console.warn(`FeeConverterPipe: necessary properties missing!\n` + `Protocol: ${args.protocolIdentifier}\n` + `Value: ${value}`)
      return ''
    }
    let protocol

    try {
      protocol = getProtocolByIdentifier(args.protocolIdentifier)
    } catch (e) {
      return ''
    }

    const amount = new BigNumber(value)
    const fee = amount.shiftedBy(-1 * protocol.feeDecimals)

    return fee.toFixed() + ' ' + protocol.feeSymbol.toUpperCase()
  }
}
