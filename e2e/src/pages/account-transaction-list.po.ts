import { PageObjectBase } from '../base.po'

export class AccountTransactionListPage extends PageObjectBase {
  public async clickPasteFromClipboard(): Promise<void> {
    return this.clickButton('#paste-clipboard')
  }
}
