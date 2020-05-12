export async function promiseTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  // Create a promise that rejects in <ms> milliseconds
  const timeout: Promise<T> = new Promise<T>(
    (_resolve, reject): void => {
      setTimeout(() => {
        reject(`Timed out in ${ms} ms.`)
      }, ms)
    }
  )

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout])
}

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
