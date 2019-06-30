export enum ActionState {
  READY,

  PREPARING,
  PREPARED,

  EXECUTING,
  EXECUTED,

  COMPLETING,
  COMPLETED,

  ERRORING,
  ERROR,

  CANCELLING,
  CANCELLED
}

export interface ActionProgress<U> {
  percentage: number
  stage: string
  info: U
}

export interface ActionInfo {
  [key: string]: string | undefined
}

/**
 * We have all the methods as readonly properties to prevent users from accidentally overwriting them.
 */
export abstract class Action<CONTEXT, PROGRESS, RESULT> {
  public readonly identifier: string = 'action'
  public info: ActionInfo = {}
  public context: CONTEXT

  public prepareFunction: () => Promise<CONTEXT | void> = () => undefined
  public beforeHandler: () => Promise<void> = () => undefined
  public handlerFunction: (context: CONTEXT) => Promise<RESULT> = () => undefined
  public afterHandler: () => Promise<void> = () => undefined
  public progressFunction: (context: CONTEXT, progress: ActionProgress<PROGRESS>) => Promise<void> = () => undefined
  public completeFunction: (context: CONTEXT, result?: RESULT) => Promise<void> = () => undefined
  public errorFunction: (context: CONTEXT, error: Error) => Promise<void> = () => undefined
  public cancelFunction: (context: CONTEXT) => Promise<void> = () => undefined

  protected data: { [key: string]: unknown } = {}
  private progress: ActionProgress<PROGRESS> | undefined
  private state: ActionState = ActionState.READY

  constructor(context?: CONTEXT) {
    this.context = context
  }

  public readonly perform: () => Promise<RESULT> = async () => {
    console.log(`${this.identifier}-PERFORM`)

    await this.onPrepare()

    await this.beforeHandler()
    const result: RESULT = await this.handler()
    await this.afterHandler()

    await this.onComplete(result)

    return result
  }

  public readonly getState: () => Promise<ActionState> = async () => {
    return this.state
  }

  public readonly getProgress: () => Promise<ActionProgress<PROGRESS> | undefined> = async () => {
    return this.progress
  }

  public readonly cancel: () => Promise<void> = async () => {
    await this.onCancel()
  }

  protected readonly onPrepare: () => Promise<void> = async () => {
    console.log(`${this.identifier}-ONPREPARE`)

    this.state = ActionState.PREPARING

    const preparedContext: CONTEXT | void = await this.prepareFunction()
    if (preparedContext) {
      // We only overwrite the context if onPrepare returns one
      this.context = preparedContext
    }

    this.state = ActionState.PREPARED
  }

  protected readonly handler: () => Promise<RESULT> = async () => {
    console.log(`${this.identifier}-HANDLER`)

    this.state = ActionState.EXECUTING

    const result: RESULT = await this.handlerFunction(this.context)

    this.state = ActionState.EXECUTED

    return result
  }

  protected readonly onProgress: (progress: ActionProgress<PROGRESS>) => Promise<void> = async (progress: ActionProgress<PROGRESS>) => {
    console.log(`${this.identifier}-ONPROGRESS`)

    this.progress = progress

    return this.progressFunction(this.context, progress)
  }

  protected readonly onComplete: (result?: RESULT) => Promise<void> = async (result?: RESULT) => {
    console.log(`${this.identifier}-ONCOMPLETE`)

    this.state = ActionState.COMPLETING

    await this.completeFunction(this.context, result)

    this.state = ActionState.COMPLETED
  }

  protected onError: (error: Error) => Promise<void> = async (error: Error) => {
    console.log(`${this.identifier}-ONERROR`)

    this.state = ActionState.ERRORING

    await this.errorFunction(this.context, error)

    this.state = ActionState.ERRORING
  }

  protected onCancel: () => Promise<void> = async () => {
    console.log(`${this.identifier}-ONPREPARE`)

    this.state = ActionState.CANCELLING

    await this.cancelFunction(this.context)

    this.state = ActionState.CANCELLED
  }
}
