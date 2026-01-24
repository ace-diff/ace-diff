export interface ArrowInfo {
  className: string
  topOffset: number
  tooltip: string
  diffIndex: number
  arrowContent: string
}

export default function createArrow(info: ArrowInfo): HTMLDivElement {
  const el = document.createElement('div')
  const props: Record<string, string | number> = {
    class: info.className,
    style: `top:${info.topOffset}px`,
    title: info.tooltip,
    'data-diff-index': info.diffIndex,
  }
  for (const key in props) {
    el.setAttribute(key, String(props[key]))
  }
  el.innerHTML = info.arrowContent
  return el
}
