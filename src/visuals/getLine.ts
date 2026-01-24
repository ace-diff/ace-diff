import type { EditorInstance } from '../types/ace.js'

export default function getLine(editor: EditorInstance, line: number): string {
  return editor.ace.getSession().doc.getLine(line)
}
