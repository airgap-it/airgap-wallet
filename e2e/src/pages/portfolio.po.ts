import { PageObjectBase } from '../base.po'

export class PortfolioPage extends PageObjectBase {
  public async clickAddInitialCoin(): Promise<void> {
    return this.clickButton('#add-initial-coin-button')
  }
}
