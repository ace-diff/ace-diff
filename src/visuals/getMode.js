import C from '../constants.js'

export default function getMode(acediff, editor) {
  let { mode } = acediff.options
  if (editor === C.EDITOR_LEFT && acediff.options.left.mode !== null) {
    mode = acediff.options.left.mode
  }
  if (editor === C.EDITOR_RIGHT && acediff.options.right.mode !== null) {
    mode = acediff.options.right.mode
  }
  return mode
}
