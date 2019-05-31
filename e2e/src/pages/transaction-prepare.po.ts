import { PageObjectBase } from '../base.po'

export class TransactionPreparePage extends PageObjectBase {
  public async clickPasteFromClipboard(): Promise<void> {
    return this.clickButton('#paste-clipboard')
  }
}
