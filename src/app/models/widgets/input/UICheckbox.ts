import { UIWidgetType } from '../UIWidget'
import { UIInputWidgetConfig, UIInputWidget } from '../UIInputWidget'

export interface UICheckboxConfig extends UIInputWidgetConfig {
  label: string
  defaultValue?: boolean

  onValueChanged?: (value?: boolean, widget?: UICheckbox) => void
  onConnectedFormChanged?: (value?: any, widget?: UICheckbox) => void
}

export class UICheckbox extends UIInputWidget<boolean> {
  public readonly type = UIWidgetType.CHECKBOX

  public label: string

  constructor(config: UICheckboxConfig) {
    super(config)

    this.label = config.label
    this.value = config.defaultValue || false
  }
}
