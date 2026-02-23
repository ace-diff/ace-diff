import { EDITOR_LEFT, EDITOR_RIGHT, type EditorSide } from '../constants.js'
import type { AceDiffOptions } from '../types/options.js'

interface AceDiffInstance {
  options: AceDiffOptions
}

export default function getTheme(
  acediff: AceDiffInstance,
  editor: EditorSide,
): string | null {
  let { theme } = acediff.options
  if (editor === EDITOR_LEFT && acediff.options.left.theme !== null) {
    theme = acediff.options.left.theme ?? theme
  }
  if (editor === EDITOR_RIGHT && acediff.options.right.theme !== null) {
    theme = acediff.options.right.theme ?? theme
  }
  return theme
}
