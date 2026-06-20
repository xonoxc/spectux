import { fromPromise, fromThrowable } from 'neverthrow'

export function attempt<T, TError = Error>(promise: Promise<T>) {
  return fromPromise(promise, (err) => err as TError)
}

export function attemptSync<T, TError = Error>(func: () => T) {
  return fromThrowable(func, (err) => err as TError)()
}
