import { AddressService } from '@airgap/angular-core'
import { ICoinProtocol } from '@airgap/coinlib-core'
import { UntypedFormControl } from '@angular/forms'

export class AddressValidator {
  public static validate(protocol: ICoinProtocol, addressService: AddressService): any {
    return async (control: UntypedFormControl) => {
      const isValid: boolean = await addressService.validate(String(control.value), protocol)
      if (!isValid) {
        return { addressFormat: 'Address format is unknown.' }
      }

      return null
    }
  }
}
