import { Pipe, PipeTransform } from '@angular/core'
import { BigNumber } from 'bignumber.js'

@Pipe({
  name: 'percentage'
})
export class PercentagePipe implements PipeTransform {
  public transform(value: BigNumber | string | number): string {
    if (BigNumber.isBigNumber(value)) {
      value = value.toNumber()
    }
    const amount = new BigNumber(value)
    const percentage = amount.shiftedBy(2).toFixed(2)

    return `${percentage}%`
  }
}
