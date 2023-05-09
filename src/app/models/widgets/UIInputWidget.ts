import { UIWidget, UIWidgetConfig } from './UIWidget'
import { AbstractControl, ValidatorFn } from '@angular/forms'
import { AirGapMarketWallet } from '@airgap/coinlib-core'

export interface UIInputWidgetConfig extends UIWidgetConfig {
  id: string

  formControl?: AbstractControl
  validators?: ValidatorFn | ValidatorFn[]

  onValueChanged?: (value?: any, widget?: any) => void
}

export abstract class UIInputWidget<T> extends UIWidget {
  public readonly id: string

  public formControl?: AbstractControl
  public validators?: ValidatorFn | ValidatorFn[]

  public value: T
  public wallet?: AirGapMarketWallet

  protected onValueChangedCallback?: (value: T, widget: UIInputWidget<T>) => void

  constructor(config: UIInputWidgetConfig) {
    super(config)

    this.validators = config.validators
    this.setFormControl(config.formControl)

    this.onValueChangedCallback = config.onValueChanged
  }

  public setFormControl(formControl?: AbstractControl) {
    if (!formControl) {
      return
    }

    this.formControl = formControl

    if (this.validators) {
      this.formControl.setValidators(this.validators)
    }

    this.formControl.valueChanges.subscribe((value) => {
      if (value !== undefined || value !== null) {
        this.value = value
        this.onValueChanged()
      }
    })

    if (this.value !== undefined && this.value !== null) {
      this.formControl.patchValue(this.value)
    } else if (this.formControl.value !== null) {
      this.value = this.formControl.value
    }
  }

  protected onValueChanged() {
    if (this.onValueChangedCallback) {
      this.onValueChangedCallback(this.value, this)
    }
  }
}
