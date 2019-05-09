import { FormControl } from '@angular/forms'

export class RegexValidator {
  public static validate(regExp: RegExp): any {
    return (control: FormControl) => {
      if (String(control.value).match(regExp) === null) {
        return { pattern: 'Pattern does not match.' }
      }
      return null
    }
  }
}
