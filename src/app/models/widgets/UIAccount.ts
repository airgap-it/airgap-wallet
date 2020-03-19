import { UIWidget, UIWidgetType } from './UIWidget'

export interface UIAccountConfig {
  name?: string
  address: string
  description?: string
}

export class UIAccount extends UIWidget {
  public readonly type = UIWidgetType.ACCOUNT
  public readonly name?: string
  public readonly address: string
  public readonly description?: string

  public get hasName(): boolean {
    return this.name !== undefined && this.name !== null
  }

  constructor(config: UIAccountConfig) {
    super()

    this.name = config.name
    this.address = config.address
    this.description = config.description
  }
}
