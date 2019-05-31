import { PageObjectBase } from '../base.po'

export class TransactionQrPage extends PageObjectBase {
  public async clickPasteFromClipboard(): Promise<void> {
    return this.clickButton('#paste-clipboard')
  }
}
