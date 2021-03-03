import { UIWidgetType } from '../UIWidget'
import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { UIInputWidgetConfig, UIInputWidget } from '../UIInputWidget'

type InputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url'

export interface UIInputTextConfig extends UIInputWidgetConfig {
  inputType?: InputType

  label: string

  placeholder?: string
  defaultValue?: string

  extraLabel?: string
  createExtraLabel?: (value: string, wallet?: AirGapMarketWallet) => string
  errorLabel?: string

  fixedValue?: string
  getFixedValue?: (wallet?: AirGapMarketWallet) => string
  toggleFixedValueButton?: string

  onValueChanged?: (value?: string, widget?: UIInputText) => void
}

export class UIInputText extends UIInputWidget<string> {
  public readonly type = UIWidgetType.INPUT_TEXT
  public readonly inputType: InputType

  public label: string
  public placeholder: string

  public extraLabel?: string
  public createExtraLabel?: (value: string) => string
  public errorLabel?: string

  public fixedValue?: string
  public getFixedValue?: () => string
  public toggleFixedValueButton?: string

  public isValueFixed: boolean = false

  constructor(config: UIInputTextConfig) {
    super(config)

    this.inputType = config.inputType || 'text'
    this.label = config.label
    this.placeholder = config.placeholder || ''

    this.value = config.defaultValue || ''

    this.createExtraLabel = config.createExtraLabel ? (value: string) => config.createExtraLabel(value, this.wallet) : undefined
    this.extraLabel = config.extraLabel || this.createExtraLabel ? this.createExtraLabel(this.value) : undefined
    this.errorLabel = config.errorLabel

    this.fixedValue = config.fixedValue
    this.getFixedValue = config.getFixedValue ? () => config.getFixedValue(this.wallet) : undefined
    this.toggleFixedValueButton = config.toggleFixedValueButton
  }

  public onValueChanged() {
    this.isValueFixed = this.fixedValue === this.value

    if (this.createExtraLabel) {
      this.extraLabel = this.createExtraLabel(this.value)
    }

    if (this.onValueChangedCallback) {
      this.onValueChangedCallback(this.value, this)
    }
  }

  public toggleValue() {
    this.isValueFixed = !this.isValueFixed
    if (this.isValueFixed && this.formControl) {
      this.formControl.patchValue(this.fixedValue || this.getFixedValue())
    }
  }
}
