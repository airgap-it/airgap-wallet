import { UIWidget, UIWidgetType, UIWidgetConfig } from '../UIWidget'

export interface UIAccountSummaryConfig extends UIWidgetConfig {
  address: string
  image?: string
  header: string | [string, string]
  description: string | [string, string]
}

export class UIAccountSummary extends UIWidget {
  public readonly type = UIWidgetType.ACCOUNT_SUMMARY

  public address: string
  public imageSrc?: string
  public header: [string, string]
  public description: [string, string]

  constructor(config: UIAccountSummaryConfig) {
    super(config)

    this.address = config.address
    this.imageSrc = config.image
    this.header = typeof config.header === 'string' ? [config.header, ''] : config.header
    this.description = typeof config.description === 'string' ? [config.description, ''] : config.description
  }
}
