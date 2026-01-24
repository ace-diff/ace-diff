import type { Ace } from 'ace-builds'
import type { DiffInfo } from './diff.js'

export interface EditorOptions {
  /** Element ID or null to auto-generate */
  id: string | null
  /** Initial content */
  content: string | null
  /** Ace editor mode (e.g., 'ace/mode/javascript') */
  mode: string | null
  /** Ace editor theme (e.g., 'ace/theme/monokai') */
  theme: string | null
  /** Whether the editor is editable */
  editable: boolean
  /** Whether to show copy arrows */
  copyLinkEnabled: boolean
}

/** Ace namespace with edit function */
export interface AceStatic {
  edit: (element: string | HTMLElement) => Ace.Editor
  Range?: new (
    startRow: number,
    startColumn: number,
    endRow: number,
    endColumn: number,
  ) => Ace.Range
  acequire?: (module: string) => unknown
  require?: (module: string) => unknown
}

export interface ClassOptions {
  gutterID: string
  diff: string
  diffChar: string
  diffGutter: string
  connector: string
  newCodeConnectorLink: string
  newCodeConnectorLinkContent: string
  deletedCodeConnectorLink: string
  deletedCodeConnectorLinkContent: string
  copyRightContainer: string
  copyLeftContainer: string
}

export interface AceDiffOptions {
  /** Ace editor instance or factory */
  ace?: AceStatic | undefined
  /** Global editor mode */
  mode: string | null
  /** Global editor theme */
  theme: string | null
  /** Container element or selector */
  element: HTMLElement | string | null
  /** Diff granularity: 'specific' or 'broad' */
  diffGranularity: 'specific' | 'broad'
  /** Lock scroll between editors */
  lockScrolling: boolean
  /** Show diff highlighting */
  showDiffs: boolean
  /** Show SVG connectors */
  showConnectors: boolean
  /** Enable character-level diffs */
  charDiffs: boolean
  /** Maximum diffs before silent failure */
  maxDiffs: number
  /** Left editor options */
  left: Partial<EditorOptions>
  /** Right editor options */
  right: Partial<EditorOptions>
  /** CSS class overrides */
  classes: Partial<ClassOptions>
  /** Y offset for connectors */
  connectorYOffset: number
  /** Callback when diff calculation completes */
  onDiffReady: ((diffs: DiffInfo[]) => void) | null
}
