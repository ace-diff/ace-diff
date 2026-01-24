export interface CharRange {
  start: number
  end: number
  lineStart: number
  lineEnd: number
}

export interface DiffInfo {
  leftStartLine: number
  leftEndLine: number
  rightStartLine: number
  rightEndLine: number
  leftStartOffset: number
  leftEndOffset: number
  rightStartOffset: number
  rightEndOffset: number
  leftStartChar?: number
  leftEndChar?: number
  rightStartChar?: number
  rightEndChar?: number
  leftChars: CharRange[]
  rightChars: CharRange[]
}

export const enum DiffType {
  Equal = 0,
  Delete = -1,
  Insert = 1,
}
