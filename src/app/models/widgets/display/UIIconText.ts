import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'

export interface UIIconTextConfig extends UIWidgetConfig {
  iconName: string
  text: string
  description?: string

  onConnectedFormChanged?: (value?: any, widget?: UIIconText) => void
}

export class UIIconText extends UIWidget {
  public readonly type = UIWidgetType.ICON_TEXT
  public readonly iconName: string

  public text: string
  public description?: string

  constructor(config: UIIconTextConfig) {
    super(config)

    this.iconName = config.iconName
    this.text = config.text
    this.description = config.description
  }

  protected onFormGroupSet() {
    console.log('set')
  }
}
