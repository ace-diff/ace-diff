import type { AceDiffOptions } from '../types/options.js'

interface AceDiffInstance {
  options: AceDiffOptions
}

export default function getEditorHeight(acediff: AceDiffInstance): number {
  const leftId = acediff.options.left.id
  if (!leftId) return 0
  const element = document.getElementById(leftId)
  return element?.offsetHeight ?? 0
}
