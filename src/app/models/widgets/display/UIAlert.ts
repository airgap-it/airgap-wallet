import { UIWidget, UIWidgetConfig, UIWidgetType } from '../UIWidget'

export type UIAlertColor = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark'

export interface UIAlertConfig extends UIWidgetConfig {
  title: string
  description: string
  icon: string
  color: UIAlertColor
  detail?: boolean

  onClick?: () => void
}

export class UIAlert extends UIWidget {
  public type: UIWidgetType = UIWidgetType.ALERT

  public readonly title: string
  public readonly description: string
  public readonly icon: string
  public readonly color: UIAlertColor
  public readonly detail: boolean

  public readonly onClick?: () => void

  constructor(config: UIAlertConfig) {
    super(config)

    this.title = config.title
    this.description = config.description
    this.icon = config.icon
    this.color = config.color
    this.detail = config.detail !== undefined ? config.detail : false

    this.onClick = config.onClick
  }
}
