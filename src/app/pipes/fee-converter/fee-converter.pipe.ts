import { Pipe, PipeTransform } from '@angular/core'
import { getProtocolByIdentifier, ICoinProtocol, ProtocolNetwork } from 'airgap-coin-lib'
import { BigNumber } from 'bignumber.js'
import { ProtocolSymbols } from 'airgap-coin-lib/dist/utils/ProtocolSymbols'

@Pipe({
  name: 'feeConverter'
})
export class FeeConverterPipe implements PipeTransform {
  public transform(
    value: BigNumber | string | number,
    args: { protocol: ICoinProtocol | ProtocolSymbols; network?: ProtocolNetwork }
  ): string {
    if (BigNumber.isBigNumber(value)) {
      value = value.toNumber()
    }
    if (!args.protocol || (!value && value !== 0) || isNaN(Number(value))) {
      // console.warn(`FeeConverterPipe: necessary properties missing!\n` + `Protocol: ${args.protocolIdentifier}\n` + `Value: ${value}`)
      return ''
    }
    let protocol: ICoinProtocol

    try {
      protocol = typeof args.protocol === 'string' ? getProtocolByIdentifier(args.protocol, args.network) : args.protocol
    } catch (e) {
      return ''
    }

    const amount = new BigNumber(value)
    const fee = amount.shiftedBy(-1 * protocol.feeDecimals)

    return fee.toFixed() + ' ' + protocol.feeSymbol.toUpperCase()
  }
}
