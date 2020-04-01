import { ValidatorFn, AbstractControl } from '@angular/forms'
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

export interface UIInputWidgetConfig<T> extends UIWidgetConfig {
  id: string
  formControl?: AbstractControl
  validators?: ValidatorFn | ValidatorFn[]

  onValueChanged?: (value: T) => void
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

  public widgetControl?: AbstractControl
  public readonly validators?: ValidatorFn | ValidatorFn[]

  public readonly onValueChangedCallback?: (value: T) => void

  public value: T

  public wallet?: AirGapMarketWallet

  constructor(config: UIInputWidgetConfig<T>) {
    super(config)

    this.id = config.id
    this.validators = config.validators
    this.widgetControl = config.formControl

    this.onValueChangedCallback = config.onValueChanged
  }

  public setWidgetForm(widgetControl: AbstractControl) {
    this.widgetControl = widgetControl

    if (this.validators) {
      this.widgetControl.setValidators(this.validators)
    }

    this.widgetControl.valueChanges.subscribe(value => {
      if (value) {
        this.value = value
        this.onValueChanged()
      }
    })

    if (this.value !== undefined || this.value !== null) {
      this.widgetControl.patchValue(this.value)
    }
  }

  protected onValueChanged() {
    if (this.onValueChangedCallback) {
      this.onValueChangedCallback(this.value)
    }
  }
}
