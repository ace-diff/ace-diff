export const DIFF_EQUAL = 0 as const
export const DIFF_DELETE = -1 as const
export const DIFF_INSERT = 1 as const

export const EDITOR_RIGHT = 'right' as const
export const EDITOR_LEFT = 'left' as const

export const RTL = 'rtl' as const
export const LTR = 'ltr' as const

export const SVG_NS = 'http://www.w3.org/2000/svg' as const

export const DIFF_GRANULARITY_SPECIFIC = 'specific' as const
export const DIFF_GRANULARITY_BROAD = 'broad' as const

export type EditorSide = typeof EDITOR_LEFT | typeof EDITOR_RIGHT
export type CopyDirection = typeof LTR | typeof RTL
export type DiffGranularity =
  | typeof DIFF_GRANULARITY_SPECIFIC
  | typeof DIFF_GRANULARITY_BROAD

// Default export for backward compatibility
export default {
  DIFF_EQUAL,
  DIFF_DELETE,
  DIFF_INSERT,
  EDITOR_RIGHT,
  EDITOR_LEFT,
  RTL,
  LTR,
  SVG_NS,
  DIFF_GRANULARITY_SPECIFIC,
  DIFF_GRANULARITY_BROAD,
} as const
