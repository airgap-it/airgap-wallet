import { PageObjectBase } from '../base.po'

export class AccountImportPage extends PageObjectBase {
  public async clickImport(): Promise<void> {
    return this.clickButton('#import')
  }
}
