import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'

export interface UIAccountExtendedDetailsConfig extends UIWidgetConfig {
  items: UIAccountExtendedDetailsItem[]
}

export interface UIAccountExtendedDetailsItem {
  label: string
  text: string
}

export class UIAccountExtendedDetails extends UIWidget {
  public type = UIWidgetType.ACCOUNT_EXTENDED_DETAILS

  public items: UIAccountExtendedDetailsItem[]

  constructor(config: UIAccountExtendedDetailsConfig) {
    super(config)
    this.items = config.items
  }
}
