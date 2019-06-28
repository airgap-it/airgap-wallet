import { Action } from '../Action'

export class AddTokenAction extends Action<any, any, any> {
  public readonly identifier: string = 'tezos-originate-action'
  public info = {
    name: 'account-transaction-list.add-tokens_label',
    icon: 'add'
  }
}
