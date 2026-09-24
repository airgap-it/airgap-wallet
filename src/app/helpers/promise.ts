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

export async function promiseDelay<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      promise.then(resolve).catch(reject)
    }, ms)
  })
}

const PROMISE_RETRY_MAX = 3
const PROMISE_RETRY_INTERVAL = 500

export async function promiseRetry<T>(
  promise: Promise<T>,
  options: { maxRetries: number; interval: number } = { maxRetries: PROMISE_RETRY_MAX, interval: PROMISE_RETRY_INTERVAL }
): Promise<T> {
  const retry: (remaining: number) => Promise<T> = async (remaining: number): Promise<T> => {
    if (remaining <= 0) {
      return promise
    }

    return promise.catch(() => {
      console.log(`promiseRetry: caught error, ${remaining} retries left, retrying...`)

      return promiseDelay(options.interval, retry(remaining - 1))
    })
  }

  return retry(options.maxRetries)
}

/**
 * Lets the browser run pending tasks (paint, input) before continuing. Awaiting
 * promises alone never does that: a chain of resolved promises runs to the end
 * in one go, so a long initialization sequence freezes the page until it is done.
 */
export function yieldToMain(): Promise<void> {
  const scheduler: { yield?: () => Promise<void> } | undefined = (globalThis as any).scheduler
  if (scheduler?.yield !== undefined) {
    return scheduler.yield()
  }

  return new Promise((resolve) => setTimeout(resolve, 0))
}
