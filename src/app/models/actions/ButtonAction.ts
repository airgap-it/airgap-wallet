import { Action } from '@airgap/coinlib-core/actions/Action'
import { RepeatableAction } from '@airgap/coinlib-core/actions/RepeatableAction'

export interface ButtonActionContext {
  name: string
  icon: string
  identifier: string
}

export class ButtonAction<Result, Context> extends RepeatableAction<Result, Context, ButtonActionContext> {
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
