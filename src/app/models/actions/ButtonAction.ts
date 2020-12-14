import { Action } from 'airgap-coin-lib/dist/actions/Action'
import { RepeatableAction } from 'airgap-coin-lib/dist/actions/RepeatableAction'

export interface ButtonActionContext {
  name: string
  icon: string
  identifier: string
}

export class ButtonAction<Result, Context> extends RepeatableAction<Result, Context, ButtonActionContext> {
  // @ts-ignore
  public get identifier(): string {
    return this.context.identifier
  }

  public set identifier(_value: string) {
    // TODO: Does this have to be empty?
  }

  public constructor(context: ButtonActionContext, actionFactory: () => Action<Result, Context>) {
    super(context, actionFactory)
  }
}
