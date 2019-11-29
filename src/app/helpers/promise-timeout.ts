export async function promiseTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  // Create a promise that rejects in <ms> milliseconds
  const timeout: Promise<T> = new Promise<T>((_resolve, reject): void => {
    setTimeout(() => {
      reject(`Timed out in ${ms} ms.`)
    }, ms)
  })

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout])
}
