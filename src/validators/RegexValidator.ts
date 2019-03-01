import { FormControl } from '@angular/forms'

export class RegexValidator {
  static validate(regExp: RegExp): any {
    return (control: FormControl) => {
      if (String(control.value).match(regExp) === null) {
        console.log('invalid')
        return false
      }
      console.log('valid')
      return true
    }
  }
}
