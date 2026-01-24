import { EDITOR_LEFT, EDITOR_RIGHT, type EditorSide } from '../constants.js'
import type { AceDiffOptions } from '../types/options.js'

interface AceDiffInstance {
  options: AceDiffOptions
}

export default function getMode(
  acediff: AceDiffInstance,
  editor: EditorSide,
): string | null {
  let { mode } = acediff.options
  if (editor === EDITOR_LEFT && acediff.options.left.mode !== null) {
    mode = acediff.options.left.mode ?? mode
  }
  if (editor === EDITOR_RIGHT && acediff.options.right.mode !== null) {
    mode = acediff.options.right.mode ?? mode
  }
  return mode
}
