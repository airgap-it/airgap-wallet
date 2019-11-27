// tslint:disable:no-implicit-dependencies

import { PageObjectBase } from '../base.po'

export class AppPage extends PageObjectBase {
  public async clickDismissButton(): Promise<void> {
    return this.clickButton('#dismiss-button')
  }

  public async clickPortfolioTab(): Promise<void> {
    return this.clickButton('#tab-button-portfolio')
  }

  public async clickScanTab(): Promise<void> {
    return this.clickButton('#tab-button-scan')
  }

  public async clickExchangeTab(): Promise<void> {
    return this.clickButton('#tab-button-exchange')
  }

  public async clickSettingsTab(): Promise<void> {
    return this.clickButton('#tab-button-settings')
  }
}
