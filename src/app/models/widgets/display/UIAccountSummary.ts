import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'
import { SafeUrl } from '@angular/platform-browser'

export interface UIAccountSummaryConfig extends UIWidgetConfig {
  address: string
  logo?: string | SafeUrl
  header: string | [string, string]
  description: string | [string, string]
}

export class UIAccountSummary extends UIWidget {
  public readonly type = UIWidgetType.ACCOUNT_SUMMARY

  public address: string
  public logo?: string | SafeUrl
  public header: [string, string]
  public description: [string, string]

  constructor(config: UIAccountSummaryConfig) {
    super(config)

    this.address = config.address
    this.logo = config.logo
    this.header = typeof config.header === 'string' ? [config.header, ''] : config.header
    this.description = typeof config.description === 'string' ? [config.description, ''] : config.description
  }

  public onInvalidLogo(): void {
    this.logo = undefined
  }
}
