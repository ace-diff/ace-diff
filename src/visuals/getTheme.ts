import C from '../constants.js'

export default function getTheme(acediff, editor) {
  let { theme } = acediff.options
  if (editor === C.EDITOR_LEFT && acediff.options.left.theme !== null) {
    theme = acediff.options.left.theme
  }
  if (editor === C.EDITOR_RIGHT && acediff.options.right.theme !== null) {
    theme = acediff.options.right.theme
  }
  return theme
}
