import { Validator, FormGroup } from '@angular/forms'

export enum UIWidgetType {
  ICON_TEXT = 'icon_text',
  INPUT_TEXT = 'input_text',
  SELECT = 'select',
  CHECKBOX = 'checkbox'
}

export interface UIInputWidgetConfig {
  id: string
  validator?: Validator
}

export abstract class UIWidget {
  public abstract readonly type: UIWidgetType
}

export abstract class UIInputWidget<T> extends UIWidget {
  public readonly id: string
  public controlName: string

  public readonly validator?: Validator

  public value: T
  public widgetForm?: FormGroup

  constructor(config: UIInputWidgetConfig) {
    super()

    this.id = config.id
    this.validator = config.validator

    this.controlName = this.id
  }

  public setWidgetForm(widgetForm: FormGroup) {
    this.widgetForm = widgetForm

    if (this.value !== undefined || this.value !== null) {
      this.widgetForm.patchValue({
        [this.controlName]: this.value
      })
    }

    this.widgetForm.valueChanges.subscribe(value => {
      if (value && value[this.controlName]) {
        this.value = value[this.controlName]
        this.onValueChanged()
      }
    })
  }

  protected onValueChanged() {}
}
