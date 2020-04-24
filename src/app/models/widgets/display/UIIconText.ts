import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'

export interface UIIconTextConfig extends UIWidgetConfig {
  iconName: string
  text?: string
  textHTML?: string

  description?: string
  descriptionHTML?: string
}

export class UIIconText extends UIWidget {
  public readonly type = UIWidgetType.ICON_TEXT
  public readonly iconName: string

  public text?: string
  public textHTML?: string

  public description?: string
  public descriptionHTML?: string

  constructor(config: UIIconTextConfig) {
    super(config)

    this.iconName = config.iconName

    this.text = config.text
    this.textHTML = config.textHTML

    this.description = config.description
    this.descriptionHTML = config.descriptionHTML
  }

  protected onFormGroupSet() {
    console.log('set')
  }
}
