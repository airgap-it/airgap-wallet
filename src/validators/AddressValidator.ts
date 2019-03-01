import { ICoinProtocol } from 'airgap-coin-lib'
import { FormControl } from '@angular/forms'

export class AddressValidator {
  static validate(protocol: ICoinProtocol): any {
    let regExp = protocol.addressValidationPattern
    return (control: FormControl) => {
      if (String(control.value).match(regExp) === null) {
        console.log(control.value, 'address invalid')
        return false
      }
      console.log(control, 'address valid')
      return true
    }
  }
}
