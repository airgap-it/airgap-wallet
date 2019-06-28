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

  public prepareFunction: () => Promise<CONTEXT> = () => undefined
  public handlerFunction: (context: CONTEXT) => Promise<RESULT> = () => undefined
  public progressFunction: (progress: ActionProgress<PROGRESS>) => Promise<void> = () => undefined
  public completeFunction: (result?: RESULT) => Promise<void> = () => undefined
  public errorFunction: (error: Error) => Promise<void> = () => undefined
  public cancelFunction: () => Promise<void> = () => undefined

  private progress: ActionProgress<PROGRESS> | undefined
  private state: ActionState = ActionState.READY

  public readonly perform: () => Promise<RESULT> = async () => {
    console.log(`${this.identifier}-PERFORM`)

    const context: CONTEXT = await this.onPrepare()
    const result: RESULT = await this.handler(context)
    await this.onComplete(context, result)

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

  protected readonly onPrepare: () => Promise<CONTEXT> = async () => {
    console.log(`${this.identifier}-ONPREPARE`)

    this.state = ActionState.PREPARING

    const context: CONTEXT = await this.prepareFunction()

    this.state = ActionState.PREPARED

    return context
  }

  protected readonly handler: (context: CONTEXT) => Promise<RESULT> = async (context: CONTEXT) => {
    console.log(`${this.identifier}-HANDLER`)

    this.state = ActionState.EXECUTING

    const result: RESULT = await this.handlerFunction(context)

    this.state = ActionState.EXECUTED

    return result
  }

  protected readonly onProgress: (progress: ActionProgress<PROGRESS>) => Promise<void> = async (progress: ActionProgress<PROGRESS>) => {
    console.log(`${this.identifier}-ONPROGRESS`)

    this.progress = progress

    return this.progressFunction(progress)
  }

  protected readonly onComplete: (context: CONTEXT, result?: RESULT) => Promise<void> = async (context: CONTEXT, result?: RESULT) => {
    console.log(`${this.identifier}-ONCOMPLETE`)

    this.state = ActionState.COMPLETING

    await this.completeFunction(result)

    this.state = ActionState.COMPLETED
  }

  protected onError: (error: Error) => Promise<void> = async (error: Error) => {
    console.log(`${this.identifier}-ONERROR`)

    this.state = ActionState.ERRORING

    await this.errorFunction(error)

    this.state = ActionState.ERRORING
  }

  protected onCancel: () => Promise<void> = async () => {
    console.log(`${this.identifier}-ONPREPARE`)

    this.state = ActionState.CANCELLING

    await this.cancelFunction()

    this.state = ActionState.CANCELLED
  }
}
