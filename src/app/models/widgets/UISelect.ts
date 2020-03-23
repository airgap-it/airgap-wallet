import { UIInputWidget, UIWidgetType, UIInputWidgetConfig } from './UIWidget'

export interface UISelectConfig extends UIInputWidgetConfig {
  label: string

  options: [any, string][]
  defaultOption?: any
}

export class UISelect extends UIInputWidget<any> {
  public readonly type = UIWidgetType.SELECT
  public readonly label: string
  public readonly options: Map<any, string>

  constructor(config: UISelectConfig) {
    super(config)

    this.label = config.label
    this.options = new Map(config.options)
    this.value = config.defaultOption
  }
}
