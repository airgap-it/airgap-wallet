import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'
import { SafeUrl } from '@angular/platform-browser'

export interface UIAccountConfig extends UIWidgetConfig {
  name?: string
  address: string
  logo?: string | SafeUrl
  description?: string

  shortenAddress?: boolean
}

export class UIAccount extends UIWidget {
  public readonly type = UIWidgetType.ACCOUNT

  public name?: string
  public address: string
  public logo?: string | SafeUrl
  public description?: string

  public shortenAddress: boolean

  public get hasName(): boolean {
    return this.name !== undefined && this.name !== null
  }

  constructor(config: UIAccountConfig) {
    super(config)

    this.name = config.name
    this.address = config.address
    this.logo = config.logo
    this.description = config.description

    this.shortenAddress = config.shortenAddress || false
  }

  public onInvalidLogo(): void {
    this.logo = undefined
  }
}
