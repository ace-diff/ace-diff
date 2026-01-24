/**
 * Search for element in parent and create it if it can't be found
 * @param parent Parent HTMLElement
 * @param elClass Element class
 * @returns ID of the element
 */
export default function ensureElement(
  parent: HTMLElement,
  elClass: string,
): string {
  const guid = Math.random().toString(36).substr(2, 5)
  const newId = `js-${elClass}-${guid}`

  const currentEl = parent.querySelector<HTMLElement>(`.${elClass}`)
  if (currentEl) {
    currentEl.id = currentEl.id || newId
    return currentEl.id
  }

  const el = document.createElement('div')
  parent.appendChild(el)
  el.className = elClass
  el.id = newId
  return el.id
}
