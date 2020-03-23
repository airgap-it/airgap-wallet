import { UIWidget, UIWidgetType, UIWidgetConfig } from './UIWidget'

export interface UIAccountConfig extends UIWidgetConfig {
  name?: string
  address: string
  description?: string

  abbreviateAddress?: boolean
  abbreviationStart?: number
  abbreviationEnd?: number
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
    super(config)

    this.name = config.name
    this.address = config.address
    this.displayAddress = config.abbreviateAddress ? this.abbreviateAddress(this.address, config) : this.address
    this.description = config.description
  }

  private abbreviateAddress(address: string, config: { abbreviationStart?: number; abbreviationEnd?: number } = {}): string {
    const start = config.abbreviationStart || 3
    const end = config.abbreviationEnd || 3

    return address.length > start + end ? address.slice(0, start) + '...' + address.substr(-end) : address
  }
}
