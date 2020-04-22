import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'

export interface UIAccountSummaryConfig extends UIWidgetConfig {
  address: string
  header: [string, string]
  description: [string, string]
}

export class UIAccountSummary extends UIWidget {
  public readonly type = UIWidgetType.ACCOUNT_SUMMARY

  public address: string
  public header: [string, string]
  public description: [string, string]

  constructor(config: UIAccountSummaryConfig) {
    super(config)

    this.address = config.address
    this.header = config.header
    this.description = config.description
  }
}
