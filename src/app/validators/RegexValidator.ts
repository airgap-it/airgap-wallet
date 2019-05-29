import { BigNumber } from 'bignumber.js'
import { FormControl } from '@angular/forms'
import { ICoinProtocol } from 'airgap-coin-lib'
import { CLIENT_RENEG_WINDOW } from 'tls'

export class RegexValidator {
  public static validate(decimals: number): (control: FormControl) => { pattern: string } | null {
    const regExpString = `^[0-9]+((\\.|,){1}[0-9]\\d{0,${decimals - 1}})?$`
    const regExp = new RegExp(regExpString)
    return (control: FormControl): { pattern: string } | null => {
      const stringAmount = new BigNumber(control.value).toFixed()
      if (stringAmount.match(regExp) === null) {
        return { pattern: 'Pattern does not match.' }
      }
      return null
    }
  }

  public static isValid(decimals: number, amount: number) {
    const regExpString = `^[0-9]+((\\.|,){1}[0-9]\\d{0,${decimals}})?$`
    const regExp = new RegExp(regExpString)
    const stringAmount = new BigNumber(amount).toFixed()
    if (stringAmount.match(regExp) === null) {
      return false
    }
    return true
  }
}
