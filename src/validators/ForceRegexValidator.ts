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
   * regExp has to be the negation of the regular expression
   * we want our desired string to match against.
   *
   * Suppose we want only values which match /(.{0,4})/g
   * regExp should match exactly all such values which are
   * not matched by the above regular expression.
   * regExp should thus be //g
   */
  forceRegexValidator(regExp: RegExp): ValidatorFn {
    return (c: FormControl) => {
      if (c.value && c.value.match(regExp) !== null) {
        let tempValue = c.value
        c.setValue(c.value.replace(regExp, tempValue.slice(0, -1)), { emitEvent: false })
      }
      return null
    }
  }
}
