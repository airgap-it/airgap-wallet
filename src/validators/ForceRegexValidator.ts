import { FormControl, Validator, ValidatorFn } from '@angular/forms'

export class ForceRegexValidator implements Validator {
  validator: ValidatorFn

  constructor(regExp: RegExp) {
    this.validator = this.forceRegexValidator(regExp)
  }

  validate(c: FormControl) {
    return this.validator(c)
  }

  /**
   * regExp has to be the regular expression
   * we want our desired string to match against.
   */

  forceRegexValidator(regExp: RegExp): ValidatorFn {
    let inverseRegExpSource = '^(?!' + regExp.source + '$).*$'
    let inverseRegExp = new RegExp(inverseRegExpSource)
    return (c: FormControl) => {
      if (c.value) {
        if (String(c.value).match(inverseRegExp) !== null) {
          let tempValue = c.value
          c.setValue(Number(c.value.replace(inverseRegExp, tempValue.slice(0, -1))), { emitEvent: false })
        }
      }
      return null
    }
  }
}
