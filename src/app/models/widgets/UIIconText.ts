import { UIWidget, UIWidgetType } from './UIWidget'

interface UIIconTextConfig {
  iconName: string
  text: string
  description?: string
}

export class UIIconText extends UIWidget {
  public readonly type = UIWidgetType.ICON_TEXT
  public readonly iconName: string
  public readonly text: string
  public readonly description?: string

  constructor(config: UIIconTextConfig) {
    super()

    this.iconName = config.iconName
    this.text = config.text
    this.description = config.description
  }
}
