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

/**
 * We have all the methods as readonly properties to prevent users from accidentally overwriting them.
 */
export abstract class Action<T, U, V> {
  public readonly identifier: string = 'action'
  public info: { [key: string]: string | undefined } = {}

  public prepareFunction: () => Promise<T> = () => undefined
  public handlerFunction: (context: T) => Promise<V> = () => undefined
  public progressFunction: (progress: ActionProgress<U>) => Promise<void> = () => undefined
  public completeFunction: (result?: V) => Promise<void> = () => undefined
  public errorFunction: (error: Error) => Promise<void> = () => undefined
  public cancelFunction: () => Promise<void> = () => undefined

  private progress: ActionProgress<U> | undefined
  private state: ActionState = ActionState.READY

  public readonly perform: () => Promise<V> = async () => {
    console.log(`${this.identifier}-PERFORM`)

    const context: T = await this.onPrepare()
    const result: V = await this.handler(context)
    await this.onComplete(result)

    return result
  }

  public readonly getState: () => Promise<ActionState> = async () => {
    return this.state
  }

  public readonly getProgress: () => Promise<ActionProgress<U> | undefined> = async () => {
    return this.progress
  }

  public readonly cancel: () => Promise<void> = async () => {
    await this.onCancel()
  }

  protected readonly onPrepare: () => Promise<T> = async () => {
    console.log(`${this.identifier}-ONPREPARE`)

    this.state = ActionState.PREPARING

    const context: T = await this.prepareFunction()

    this.state = ActionState.PREPARED

    return context
  }

  protected readonly handler: (context: T) => Promise<V> = async (context: T) => {
    console.log(`${this.identifier}-HANDLER`)

    this.state = ActionState.EXECUTING

    const result: V = await this.handlerFunction(context)

    this.state = ActionState.EXECUTED

    return result
  }

  protected readonly onProgress: (progress: ActionProgress<U>) => Promise<void> = async (progress: ActionProgress<U>) => {
    console.log(`${this.identifier}-ONPROGRESS`)

    this.progress = progress

    return this.progressFunction(progress)
  }

  protected readonly onComplete: (result?: V) => Promise<void> = async (result?: V) => {
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
