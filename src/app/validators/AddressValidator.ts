import { FormControl } from '@angular/forms'
import { ICoinProtocol } from 'airgap-coin-lib'

export class AddressValidator {
  public static validate(protocol: ICoinProtocol): any {
    const regExp = protocol.addressValidationPattern

    return (control: FormControl) => {
      if (String(control.value).match(regExp) === null) {
        return { addressFormat: 'Address format is unknown.' }
      }

      return null
    }
  }
}
