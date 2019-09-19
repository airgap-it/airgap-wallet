import { Action, RepeatableAction } from 'airgap-coin-lib/dist/actions/Action'

export interface ButtonActionContext {
  name: string
  icon: string
  identifier: string
}

export class ButtonAction<Result, Context> extends RepeatableAction<Result, Context, ButtonActionContext> {
  public get identifier(): string {
    return this.context.identifier
  }

  public set identifier(value: string) {}

  public constructor(context: ButtonActionContext, actionFactory: () => Action<Result, Context>) {
    super(context, actionFactory)
  }
}
