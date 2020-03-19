import { UIWidget, UIWidgetType } from './UIWidget'

export interface UIAccountConfig {
  name?: string
  address: string
  description?: string

  abbreviateAddress?: boolean
}

export class UIAccount extends UIWidget {
  public readonly type = UIWidgetType.ACCOUNT
  public readonly name?: string
  public readonly address: string
  public readonly displayAddress: string
  public readonly description?: string

  public get hasName(): boolean {
    return this.name !== undefined && this.name !== null
  }

  constructor(config: UIAccountConfig) {
    super()

    this.name = config.name
    this.address = config.address
    this.displayAddress = config.abbreviateAddress ? this.abbreviateAddress(this.address) : this.address
    this.description = config.description
  }

  private abbreviateAddress(address: string): string {
    return address.slice(0, 3) + '...' + address.substr(-3)
  }
}
