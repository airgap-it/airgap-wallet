import { ICoinProtocol } from 'airgap-coin-lib'
import { FormControl } from '@angular/forms'

export class AddressValidator {
  static validate(protocol: ICoinProtocol): any {
    const regExp = protocol.addressValidationPattern
    return (control: FormControl) => {
      if (String(control.value).match(regExp) === null) {
        return { addressFormat: 'Address format is unknown.' }
      }
      return null
    }
  }
}
