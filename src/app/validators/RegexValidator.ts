import { FormControl } from '@angular/forms'

export class RegexValidator {
  public static validate(regExp: RegExp): (control: FormControl) => { pattern: string } | null {
    return (control: FormControl): { pattern: string } | null => {
      if (String(control.value).match(regExp) === null) {
        return { pattern: 'Pattern does not match.' }
      }

      return null
    }
  }
}
