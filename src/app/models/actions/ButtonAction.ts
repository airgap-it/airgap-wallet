import { Action } from 'airgap-coin-lib/dist/actions/Action'

export interface ButtonActionContext {
  name: string
  icon: string
}

export class ButtonAction<Result, Context> extends Action<Result, ButtonActionContext> {
  private readonly action: Action<Result, Context>

  public constructor(context: ButtonActionContext, action: Action<Result, Context>) {
    super(context)
    this.action = action
  }

  protected async perform(): Promise<Result> {
    await this.action.start()
    return this.action.result
  }
}
