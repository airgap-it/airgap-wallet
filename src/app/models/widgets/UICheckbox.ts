import { UIInputWidget, UIWidgetType, UIInputWidgetConfig } from './UIWidget'

export interface UICheckboxConfig extends UIInputWidgetConfig {
  label: string
  defaultValue?: boolean
}

export class UICheckbox extends UIInputWidget<boolean> {
  public readonly type = UIWidgetType.CHECKBOX
  public readonly label: string

  constructor(config: UICheckboxConfig) {
    super(config)

    this.label = config.label
    this.value = config.defaultValue || false
  }
}
