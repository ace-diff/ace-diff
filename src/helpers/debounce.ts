export default function debounce<T extends (...args: unknown[]) => void>(
  callback: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return function (this: unknown, ...args: Parameters<T>): void {
    clearTimeout(timeout)
    timeout = setTimeout(() => callback.apply(this, args), wait)
  }
}
