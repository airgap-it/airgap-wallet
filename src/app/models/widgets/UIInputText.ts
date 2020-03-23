import { UIInputWidget, UIWidgetType, UIInputWidgetConfig } from './UIWidget'
import { AirGapMarketWallet } from 'airgap-coin-lib'

export interface UIInputTextConfig extends UIInputWidgetConfig {
  inputType: string

  label: string

  placeholder?: string
  defaultValue?: string

  customizeInput?: (value: string, wallet?: AirGapMarketWallet) => string

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
  public readonly customizeInput?: (value: string) => string

  public readonly extraLabel?: string
  public readonly createExtraLabel?: (value: string) => string
  public readonly errorLabel?: string

  public readonly fixedValue?: string
  public readonly getFixedValue?: () => string
  public readonly toggleFixedValueButton?: string

  public isValueFixed: boolean = false

  constructor(config: UIInputTextConfig) {
    super(config)

    this.controlName = this.id + '-control'

    this.inputType = config.inputType
    this.label = config.label
    this.placeholder = config.placeholder || ''

    this.value = config.defaultValue || ''
    this.customizeInput = config.customizeInput ? (value: string) => config.customizeInput(value, this.wallet) : undefined

    this.extraLabel = config.extraLabel
    this.createExtraLabel = config.createExtraLabel ? (value: string) => config.createExtraLabel(value, this.wallet) : undefined
    this.errorLabel = config.errorLabel

    this.fixedValue = config.fixedValue
    this.getFixedValue = config.getFixedValue ? () => config.getFixedValue(this.wallet) : undefined
    this.toggleFixedValueButton = config.toggleFixedValueButton
  }

  public onValueChanged() {
    this.isValueFixed = this.fixedValue === this.value

    if (this.widgetForm) {
      this.widgetForm.patchValue({ [this.id]: this.customizeInput ? this.customizeInput(this.value) : this.value }, { emitEvent: false })
    }
  }

  public toggleValue() {
    this.isValueFixed = !this.isValueFixed
    if (this.isValueFixed && this.widgetForm) {
      this.widgetForm.patchValue({ [this.controlName]: this.fixedValue || this.getFixedValue() })
    }
  }
}
