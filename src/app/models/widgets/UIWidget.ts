import { Validator, FormGroup } from '@angular/forms'
import { AirGapMarketWallet } from 'airgap-coin-lib'

export enum UIWidgetType {
  ACCOUNT = 'account',
  CHECKBOX = 'checkbox',
  ICON_TEXT = 'icon_text',
  INPUT_TEXT = 'input_text',
  SELECT = 'select'
}

export interface UIWidgetConfig {
  isVisible?: boolean
}

export interface UIInputWidgetConfig extends UIWidgetConfig {
  id: string
  validator?: Validator
}

export abstract class UIWidget {
  public abstract readonly type: UIWidgetType

  public isVisible: boolean

  constructor(config: UIWidgetConfig) {
    this.isVisible = config.isVisible !== undefined ? config.isVisible : true
  }
}

export abstract class UIInputWidget<T> extends UIWidget {
  public readonly id: string
  public controlName: string

  public readonly validator?: Validator

  public value: T
  public widgetForm?: FormGroup

  public wallet?: AirGapMarketWallet

  constructor(config: UIInputWidgetConfig) {
    super(config)

    this.id = config.id
    this.validator = config.validator

    this.controlName = this.id
  }

  public setWidgetForm(widgetForm: FormGroup) {
    this.widgetForm = widgetForm

    this.widgetForm.valueChanges.subscribe(value => {
      if (value && value[this.controlName]) {
        this.value = value[this.controlName]
        this.onValueChanged()
      }
    })

    if (this.value !== undefined || this.value !== null) {
      this.widgetForm.patchValue({
        [this.controlName]: this.value
      })
    }
  }

  protected onValueChanged() {}
}
