import { UIInputWidget, UIWidgetType, UIInputWidgetConfig } from './UIWidget'
import { AirGapMarketWallet } from 'airgap-coin-lib'

export interface UIInputTextConfig extends UIInputWidgetConfig<string> {
  inputType: string

  label: string

  placeholder?: string
  defaultValue?: string

  extraLabel?: string
  createExtraLabel?: (value: string, wallet?: AirGapMarketWallet) => string
  errorLabel?: string

  fixedValue?: string
  getFixedValue?: (wallet?: AirGapMarketWallet) => string
  toggleFixedValueButton?: string
}

export class UIInputText extends UIInputWidget<string> {
  public readonly type = UIWidgetType.INPUT_TEXT
  public readonly inputType: string

  public readonly label: string

  public readonly placeholder: string

  public extraLabel?: string
  public readonly createExtraLabel?: (value: string) => string
  public readonly errorLabel?: string

  public readonly fixedValue?: string
  public readonly getFixedValue?: () => string
  public readonly toggleFixedValueButton?: string

  public isValueFixed: boolean = false

  constructor(config: UIInputTextConfig) {
    super(config)

    this.inputType = config.inputType
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
      this.onValueChangedCallback(this.value)
    }
  }

  public toggleValue() {
    this.isValueFixed = !this.isValueFixed
    if (this.isValueFixed && this.widgetControl) {
      this.widgetControl.patchValue(this.fixedValue || this.getFixedValue())
    }
  }
}
