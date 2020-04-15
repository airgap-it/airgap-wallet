import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'

export interface UIAccountConfig extends UIWidgetConfig {
  name?: string
  address: string
  description?: string

  abbreviateAddress?: boolean
  abbreviationStart?: number
  abbreviationEnd?: number

  onConnectedFormChanged?: (value?: any, widget?: UIAccount) => void
}

export class UIAccount extends UIWidget {
  public readonly type = UIWidgetType.ACCOUNT

  public name?: string
  public address: string
  public description?: string

  public get hasName(): boolean {
    return this.name !== undefined && this.name !== null
  }

  constructor(config: UIAccountConfig) {
    super(config)

    this.name = config.name
    this.address = config.address
    this.description = config.description
  }
}
