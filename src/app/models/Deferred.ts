export class Deferred<T> {
  public readonly promise: Promise<T>

  private state: 'pending' | 'resolved' | 'rejected'

  private _resolve: (value?: T) => void
  private _reject: (reason?: any) => void

  public constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
    this.state = 'pending'
  }

  public resolve(value?: T) {
    if (this.state === 'pending') {
      this.state = 'resolved'
      this._resolve(value)
    }
  }

  public reject(reason?: any) {
    if (this.state === 'pending') {
      this.state = 'rejected'
      this._reject(reason)
    }
  }
}
