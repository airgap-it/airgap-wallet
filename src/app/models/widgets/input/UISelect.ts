import { UIWidgetType } from '../UIWidget'
import { UIInputWidgetConfig, UIInputWidget } from '../UIInputWidget'

export interface UISelectConfig extends UIInputWidgetConfig {
  label: string

  options: [any, string][]
  defaultOption?: any

  onValueChanged?: (value?: any, widget?: UISelect) => void
  onConnectedFormChanged?: (value?: any, widget?: UISelect) => void
}

export class UISelect extends UIInputWidget<any> {
  public readonly type = UIWidgetType.SELECT

  public label: string
  public options: Map<any, string>

  constructor(config: UISelectConfig) {
    super(config)

    this.label = config.label
    this.options = new Map(config.options)
    this.value = config.defaultOption
  }
}
