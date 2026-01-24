export default function on(
  elSelector: string,
  eventName: string,
  selector: string,
  fn: (event: Event) => void,
): void {
  const element =
    elSelector === 'document'
      ? document
      : document.querySelector<HTMLElement>(elSelector)

  if (!element) return

  element.addEventListener(eventName, (event: Event) => {
    const possibleTargets = element.querySelectorAll(selector)
    const target = event.target as Node | null

    for (let i = 0, l = possibleTargets.length; i < l; i += 1) {
      let el: Node | null = target
      const p = possibleTargets[i]

      while (el && el !== element) {
        if (el === p) {
          fn.call(p, event)
        }
        el = el.parentNode
      }
    }
  })
}
