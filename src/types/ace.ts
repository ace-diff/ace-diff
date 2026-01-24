import type { Ace } from 'ace-builds'

/**
 * Internal editor instance state
 */
export interface EditorInstance {
  ace: Ace.Editor
  markers: number[]
  lineLengths: number[]
  diffGutters: Array<{ line: number; className: string }>
}

/**
 * Internal editor state containing both editors
 */
export interface EditorState {
  left: EditorInstance
  right: EditorInstance
  editorHeight: number | null
}

/**
 * Ace Range constructor type
 */
export type AceRange = new (
  startRow: number,
  startColumn: number,
  endRow: number,
  endColumn: number,
) => Ace.Range
