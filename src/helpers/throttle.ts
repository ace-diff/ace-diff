export default function throttle<T extends (...args: unknown[]) => void>(
  callback: T,
  wait: number,
  immediate = false,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let initialCall = true

  return function (this: unknown, ...args: Parameters<T>): void {
    const callNow = immediate && initialCall
    const next = (): void => {
      callback.apply(this, args)
      timeout = null
    }

    if (callNow) {
      initialCall = false
      next()
    }

    if (!timeout) {
      timeout = setTimeout(next, wait)
    }
  }
}
