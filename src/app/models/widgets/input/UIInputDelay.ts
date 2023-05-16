import { AirGapMarketWallet } from '@airgap/coinlib-core'

import { UIInputWidget, UIInputWidgetConfig } from '../UIInputWidget'
import { UIWidgetType } from '../UIWidget'

type InputType = 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years'

export interface UIInputDelayConfig extends UIInputWidgetConfig {
  inputType?: InputType
  userInputType?: InputType

  label: string

  minValue: string
  fixedMinValue?: string
  maxValue: string
  defaultValue?: string

  extraLabel?: string
  createExtraLabel?: (value: string, wallet?: AirGapMarketWallet) => string
  errorLabel?: string

  onValueChanged?: (value?: string, widget?: UIInputDelay) => void
}

export class UIInputDelay extends UIInputWidget<string> {
  public readonly type = UIWidgetType.INPUT_DELAY
  public readonly inputType: InputType

  public label: string

  public readonly minValue: string
  public readonly fixedMinValue: string
  public readonly maxValue: string

  public extraLabel?: string
  public createExtraLabel?: (value: string) => string
  public errorLabel?: string

  constructor(config: UIInputDelayConfig) {
    super(config)

    this.inputType = config.inputType ?? 'milliseconds'

    this.label = config.label

    this.minValue = config.minValue
    this.fixedMinValue = config.fixedMinValue ?? this.minValue
    this.maxValue = config.maxValue
    this.value = config.defaultValue || config.fixedMinValue

    this.createExtraLabel = config.createExtraLabel ? (value: string) => config.createExtraLabel(value, this.wallet) : undefined
    this.extraLabel = config.extraLabel || this.createExtraLabel ? this.createExtraLabel(this.value) : undefined
    this.errorLabel = config.errorLabel

  }

  public onValueChanged() {
    if (this.createExtraLabel) {
      this.extraLabel = this.createExtraLabel(this.value)
    }

    if (this.onValueChangedCallback) {
      this.onValueChangedCallback(this.value, this)
    }
  }
}
