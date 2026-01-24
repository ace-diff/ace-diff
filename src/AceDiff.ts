/* eslint-disable no-console, @typescript-eslint/no-non-null-assertion */
import type { Ace } from 'ace-builds'
import { makeDiff, cleanupSemantic } from '@sanity/diff-match-patch'
import throttle from './helpers/throttle.js'
import debounce from './helpers/debounce.js'
import normalizeContent from './helpers/normalizeContent.js'

import getCurve from './visuals/getCurve.js'
import getMode from './visuals/getMode.js'
import getTheme from './visuals/getTheme.js'
import getLine from './visuals/getLine.js'
import getEditorHeight from './visuals/getEditorHeight.js'
import createArrow from './visuals/createArrow.js'

import ensureElement from './dom/ensureElement.js'
import query from './dom/query.js'
import C, {
  DIFF_EQUAL,
  DIFF_DELETE,
  DIFF_INSERT,
  EDITOR_LEFT,
  EDITOR_RIGHT,
  LTR,
  RTL,
  DIFF_GRANULARITY_BROAD,
  DIFF_GRANULARITY_SPECIFIC,
  type EditorSide,
  type CopyDirection,
} from './constants.js'

import type { AceDiffOptions, AceStatic } from './types/options.js'
import type { DiffInfo, CharRange } from './types/diff.js'
import type { EditorInstance, EditorState, AceRange } from './types/ace.js'

// Range module placeholder
let Range: AceRange | null = null

function getRangeModule(ace: AceStatic): AceRange | false {
  if (ace.Range) {
    return ace.Range
  }

  const requireFunc = ace.acequire || ace.require
  if (requireFunc) {
    return requireFunc('ace/range') as AceRange
  }

  return false
}

// Default options
const defaultOptions = {
  ace: undefined as AceStatic | undefined,
  mode: null as string | null,
  theme: null as string | null,
  element: null as HTMLElement | string | null,
  diffGranularity: DIFF_GRANULARITY_BROAD as 'specific' | 'broad',
  lockScrolling: true,
  showDiffs: true,
  showConnectors: true,
  charDiffs: true,
  maxDiffs: 5000,
  left: {
    id: null as string | null,
    content: null as string | null,
    mode: null as string | null,
    theme: null as string | null,
    editable: true,
    copyLinkEnabled: true,
  },
  right: {
    id: null as string | null,
    content: null as string | null,
    mode: null as string | null,
    theme: null as string | null,
    editable: true,
    copyLinkEnabled: true,
  },
  classes: {
    gutterID: 'acediff__gutter',
    diff: 'acediff__diffLine',
    diffChar: 'acediff__diffChar',
    diffGutter: 'acediff__diffGutter',
    connector: 'acediff__connector',
    newCodeConnectorLink: 'acediff__newCodeConnector',
    newCodeConnectorLinkContent: '&#8594;',
    deletedCodeConnectorLink: 'acediff__deletedCodeConnector',
    deletedCodeConnectorLinkContent: '&#8592;',
    copyRightContainer: 'acediff__copy--right',
    copyLeftContainer: 'acediff__copy--left',
  },
  connectorYOffset: 0,
  onDiffReady: null as ((diffs: DiffInfo[]) => void) | null,
}

export default class AceDiff {
  options: AceDiffOptions
  el!: HTMLElement
  editors!: EditorState
  diffs: DiffInfo[] = []
  lineHeight = 0
  gutterSVG: SVGSVGElement | null = null
  gutterWidth = 0
  gutterHeight = 0
  copyLeftContainer: HTMLDivElement | null = null
  copyRightContainer: HTMLDivElement | null = null
  connectorYOffset = 0
  private removeEventHandlers: (() => void) | null = null

  constructor(options: Partial<AceDiffOptions> = {}) {
    // Deep clone default options and merge with provided options
    const clonedDefaults = JSON.parse(
      JSON.stringify(defaultOptions),
    ) as typeof defaultOptions

    // Merge options
    this.options = {
      ...clonedDefaults,
      ...options,
      left: { ...clonedDefaults.left, ...options.left },
      right: { ...clonedDefaults.right, ...options.right },
      classes: { ...clonedDefaults.classes, ...options.classes },
    }

    const getDefaultAce = (): AceStatic | undefined =>
      typeof window !== 'undefined'
        ? (window as unknown as { ace?: AceStatic }).ace
        : undefined

    if (!this.options.ace) {
      this.options.ace = getDefaultAce()
    }

    const { ace } = this.options

    if (!ace) {
      const errMessage =
        'No ace editor found nor supplied - `options.ace` or `window.ace` is missing'
      console.error(errMessage)
      throw new Error(errMessage)
    }

    const rangeModule = getRangeModule(ace)
    if (!rangeModule) {
      const errMessage =
        'Could not require Range module for Ace. Depends on your bundling strategy, but it usually comes with Ace itself. See https://ace.c9.io/api/range.html, open an issue on GitHub ace-diff/ace-diff'
      console.error(errMessage)
      throw new Error(errMessage)
    }
    Range = rangeModule

    if (this.options.element === null) {
      const errMessage =
        'You need to specify an element for Ace-diff - `options.element` is missing'
      console.error(errMessage)
      throw new Error(errMessage)
    }

    if (this.options.element instanceof HTMLElement) {
      this.el = this.options.element
    } else {
      const foundEl = document.body.querySelector<HTMLElement>(
        this.options.element,
      )
      if (!foundEl) {
        const errMessage = `Can't find the specified element ${this.options.element}`
        console.error(errMessage)
        throw new Error(errMessage)
      }
      this.el = foundEl
    }

    this.options.left.id = ensureElement(this.el, 'acediff__left')
    this.options.classes.gutterID = ensureElement(this.el, 'acediff__gutter')
    this.options.right.id = ensureElement(this.el, 'acediff__right')

    this.el.innerHTML = `<div class="acediff acediff__wrap">${this.el.innerHTML}</div>`

    // instantiate the editors
    this.editors = {
      left: {
        ace: ace.edit(this.options.left.id!),
        markers: [],
        lineLengths: [],
        diffGutters: [],
      },
      right: {
        ace: ace.edit(this.options.right.id!),
        markers: [],
        lineLengths: [],
        diffGutters: [],
      },
      editorHeight: null,
    }

    // set up the editors
    this.editors.left.ace.getSession().setMode(getMode(this, EDITOR_LEFT) ?? '')
    this.editors.right.ace
      .getSession()
      .setMode(getMode(this, EDITOR_RIGHT) ?? '')
    this.editors.left.ace.setReadOnly(!this.options.left.editable)
    this.editors.right.ace.setReadOnly(!this.options.right.editable)
    this.editors.left.ace.setShowFoldWidgets(false)
    this.editors.right.ace.setShowFoldWidgets(false)
    this.editors.left.ace.setTheme(getTheme(this, EDITOR_LEFT) ?? '')
    this.editors.right.ace.setTheme(getTheme(this, EDITOR_RIGHT) ?? '')

    this.editors.left.ace.setValue(
      normalizeContent(this.options.left.content ?? null),
      -1,
    )
    this.editors.right.ace.setValue(
      normalizeContent(this.options.right.content ?? null),
      -1,
    )

    // store the visible height of the editors
    this.editors.editorHeight = getEditorHeight(this)

    // The lineHeight is set to 0 initially and we need to wait for another tick
    setTimeout(() => {
      this.lineHeight = this.editors.left.ace.renderer.lineHeight
      this.addEventHandlers()
      this.createCopyContainers()
      this.createGutter()
      this.diff()
    }, 1)
  }

  // Public methods
  setOptions(options: Partial<AceDiffOptions>): void {
    this.options = {
      ...this.options,
      ...options,
      left: { ...this.options.left, ...options.left },
      right: { ...this.options.right, ...options.right },
      classes: { ...this.options.classes, ...options.classes },
    }
    this.diff()
  }

  getNumDiffs(): number {
    return this.diffs.length
  }

  getEditors(): { left: Ace.Editor; right: Ace.Editor } {
    return {
      left: this.editors.left.ace,
      right: this.editors.right.ace,
    }
  }

  diff(): void {
    const val1 = this.editors.left.ace.getSession().getValue()
    const val2 = this.editors.right.ace.getSession().getValue()
    const diff = cleanupSemantic(makeDiff(val2, val1))

    this.editors.left.lineLengths = this.getLineLengths(this.editors.left)
    this.editors.right.lineLengths = this.getLineLengths(this.editors.right)

    const diffs: DiffInfo[] = []
    const offset = { left: 0, right: 0 }

    diff.forEach((chunk) => {
      const chunkType = chunk[0]
      const text = chunk[1]

      if (text.length === 0) return

      if (chunkType === DIFF_EQUAL) {
        offset.left += text.length
        offset.right += text.length
      } else if (chunkType === DIFF_DELETE) {
        diffs.push(
          this.computeDiff(DIFF_DELETE, offset.left, offset.right, text),
        )
        offset.right += text.length
      } else if (chunkType === DIFF_INSERT) {
        diffs.push(
          this.computeDiff(DIFF_INSERT, offset.left, offset.right, text),
        )
        offset.left += text.length
      }
    })

    this.diffs = this.simplifyDiffs(diffs)

    if (this.diffs.length > this.options.maxDiffs) {
      return
    }

    this.clearDiffs()
    this.decorate()

    if (typeof this.options.onDiffReady === 'function') {
      this.options.onDiffReady(this.diffs)
    }
  }

  clear(): void {
    this.clearDiffs()
    this.clearGutter()
    this.clearArrows()
  }

  destroy(): void {
    const leftValue = this.editors.left.ace.getValue()
    this.editors.left.ace.destroy()
    let oldDiv = this.editors.left.ace.container
    let newDiv = oldDiv.cloneNode(false) as HTMLElement
    newDiv.textContent = leftValue
    oldDiv.parentNode?.replaceChild(newDiv, oldDiv)

    const rightValue = this.editors.right.ace.getValue()
    this.editors.right.ace.destroy()
    oldDiv = this.editors.right.ace.container
    newDiv = oldDiv.cloneNode(false) as HTMLElement
    newDiv.textContent = rightValue
    oldDiv.parentNode?.replaceChild(newDiv, oldDiv)

    const elementById = document.getElementById(this.options.classes.gutterID!)
    if (elementById) {
      elementById.innerHTML = ''
    }
    this.removeEventHandlers?.()
  }

  // Private methods
  private addEventHandlers(): void {
    let isSyncingScroll = false

    const syncScroll = (
      sourceEditor: EditorInstance,
      targetEditor: EditorInstance,
    ): void => {
      if (!this.options.lockScrolling || isSyncingScroll) return

      const sourceSession = sourceEditor.ace.getSession()
      const targetSession = targetEditor.ace.getSession()

      const sourceScrollTop = sourceSession.getScrollTop()
      const sourceLineCount = sourceSession.getLength()
      const sourceContentHeight = sourceLineCount * this.lineHeight
      const sourceViewportHeight = (
        sourceEditor.ace.renderer as unknown as {
          $size: { scrollerHeight: number }
        }
      ).$size.scrollerHeight
      const sourceMaxScroll = Math.max(
        0,
        sourceContentHeight - sourceViewportHeight,
      )

      const scrollRatio =
        sourceMaxScroll > 0 ? sourceScrollTop / sourceMaxScroll : 0

      const targetLineCount = targetSession.getLength()
      const targetContentHeight = targetLineCount * this.lineHeight
      const targetViewportHeight = (
        targetEditor.ace.renderer as unknown as {
          $size: { scrollerHeight: number }
        }
      ).$size.scrollerHeight
      const targetMaxScroll = Math.max(
        0,
        targetContentHeight - targetViewportHeight,
      )

      const targetScrollTop = scrollRatio * targetMaxScroll

      isSyncingScroll = true
      targetSession.setScrollTop(targetScrollTop)
      isSyncingScroll = false
    }

    this.editors.left.ace.getSession().on(
      'changeScrollTop',
      throttle(() => {
        syncScroll(this.editors.left, this.editors.right)
        this.updateGap()
      }, 16),
    )

    this.editors.right.ace.getSession().on(
      'changeScrollTop',
      throttle(() => {
        syncScroll(this.editors.right, this.editors.left)
        this.updateGap()
      }, 16),
    )

    const diffBound = this.diff.bind(this)
    this.editors.left.ace.on('change', diffBound)
    this.editors.right.ace.on('change', diffBound)

    if (this.options.left.copyLinkEnabled) {
      query(
        `#${this.options.classes.gutterID}`,
        'click',
        `.${this.options.classes.newCodeConnectorLink}`,
        (e) => this.copy(e, LTR),
      )
    }

    if (this.options.right.copyLinkEnabled) {
      query(
        `#${this.options.classes.gutterID}`,
        'click',
        `.${this.options.classes.deletedCodeConnectorLink}`,
        (e) => this.copy(e, RTL),
      )
    }

    const onResize = debounce(() => {
      const leftEl = document.getElementById(this.options.left.id!)
      if (leftEl) {
        ;(this.editors as { availableHeight?: number }).availableHeight =
          leftEl.offsetHeight
      }
      this.diff()
    }, 250)

    window.addEventListener('resize', onResize)
    this.removeEventHandlers = () => {
      window.removeEventListener('resize', onResize)
    }
  }

  private copy(e: Event, dir: CopyDirection): void {
    const target = e.target as HTMLElement
    const diffIndex = parseInt(
      target.getAttribute('data-diff-index') ?? '0',
      10,
    )
    const diff = this.diffs[diffIndex]
    if (!diff) return

    // Don't allow copying into a non-editable editor
    if (dir === LTR && !this.options.right.editable) return
    if (dir === RTL && !this.options.left.editable) return

    let sourceEditor: EditorInstance
    let targetEditor: EditorInstance
    let sourceStartOffset: number
    let sourceEndOffset: number
    let targetStartOffset: number
    let targetEndOffset: number

    if (dir === LTR) {
      sourceEditor = this.editors.left
      targetEditor = this.editors.right
      sourceStartOffset = diff.leftStartOffset
      sourceEndOffset = diff.leftEndOffset
      targetStartOffset = diff.rightStartOffset
      targetEndOffset = diff.rightEndOffset
    } else {
      sourceEditor = this.editors.right
      targetEditor = this.editors.left
      sourceStartOffset = diff.rightStartOffset
      sourceEndOffset = diff.rightEndOffset
      targetStartOffset = diff.leftStartOffset
      targetEndOffset = diff.leftEndOffset
    }

    const sourceValue = sourceEditor.ace.getValue()
    const contentToInsert = sourceValue.substring(
      sourceStartOffset,
      sourceEndOffset,
    )

    const targetDoc = targetEditor.ace.getSession().doc
    const startPos = targetDoc.indexToPosition(targetStartOffset, 0)
    const endPos = targetDoc.indexToPosition(targetEndOffset, 0)

    const h = targetEditor.ace.getSession().getScrollTop()

    if (Range) {
      targetEditor.ace
        .getSession()
        .replace(
          new Range(startPos.row, startPos.column, endPos.row, endPos.column),
          contentToInsert,
        )
    }
    targetEditor.ace.getSession().setScrollTop(parseInt(String(h), 10))

    this.diff()
  }

  private getLineLengths(editor: EditorInstance): number[] {
    const lines = editor.ace.getSession().doc.getAllLines()
    return lines.map((line: string) => line.length + 1)
  }

  private showDiff(
    editor: EditorSide,
    startLine: number,
    endLine: number,
    chars: CharRange[],
    className: string,
  ): void {
    const editorInstance = this.editors[editor]
    let actualEndLine = endLine

    if (actualEndLine < startLine) {
      actualEndLine = startLine
    }

    const classNames = `${className} ${
      actualEndLine > startLine ? 'lines' : 'targetOnly'
    } ${editor}`

    let markerEndLine = actualEndLine
    if (markerEndLine > startLine) {
      markerEndLine -= 1
    }

    if (Range) {
      editorInstance.markers.push(
        editorInstance.ace.session.addMarker(
          new Range(startLine, 0, markerEndLine, 1),
          classNames,
          'fullLine',
        ),
      )
    }

    if (this.options.charDiffs && chars && chars.length > 0) {
      const charClassName = `${this.options.classes.diffChar} ${editor}`
      chars.forEach((char) => {
        if (Range) {
          editorInstance.markers.push(
            editorInstance.ace.session.addMarker(
              new Range(char.lineStart, char.start, char.lineEnd - 1, char.end),
              charClassName,
              'text',
            ),
          )
        }
      })
    }

    const gutterClassName = `${this.options.classes.diffGutter} ${editor}`
    for (let line = startLine; line < actualEndLine; line += 1) {
      editorInstance.ace.session.addGutterDecoration(line, gutterClassName)
      editorInstance.diffGutters.push({ line, className: gutterClassName })
    }
  }

  private updateGap(): void {
    this.clearDiffs()
    this.decorate()
    this.positionCopyContainers()
  }

  private clearDiffs(): void {
    this.editors.left.markers.forEach((marker) => {
      this.editors.left.ace.getSession().removeMarker(marker)
    })
    this.editors.right.markers.forEach((marker) => {
      this.editors.right.ace.getSession().removeMarker(marker)
    })
    this.editors.left.markers = []
    this.editors.right.markers = []

    this.editors.left.diffGutters.forEach((gutter) => {
      this.editors.left.ace.session.removeGutterDecoration(
        gutter.line,
        gutter.className,
      )
    })
    this.editors.right.diffGutters.forEach((gutter) => {
      this.editors.right.ace.session.removeGutterDecoration(
        gutter.line,
        gutter.className,
      )
    })
    this.editors.left.diffGutters = []
    this.editors.right.diffGutters = []
  }

  private addConnector(
    leftStartLine: number,
    leftEndLine: number,
    rightStartLine: number,
    rightEndLine: number,
  ): void {
    const leftScrollTop = this.editors.left.ace.getSession().getScrollTop()
    const rightScrollTop = this.editors.right.ace.getSession().getScrollTop()

    this.connectorYOffset = 1

    const p1_x = -1
    const p1_y = leftStartLine * this.lineHeight - leftScrollTop + 0.5
    const p2_x = this.gutterWidth + 1
    const p2_y = rightStartLine * this.lineHeight - rightScrollTop + 0.5
    const p3_x = -1
    const p3_y =
      leftEndLine * this.lineHeight -
      leftScrollTop +
      this.connectorYOffset +
      0.5
    const p4_x = this.gutterWidth + 1
    const p4_y =
      rightEndLine * this.lineHeight -
      rightScrollTop +
      this.connectorYOffset +
      0.5

    const curve1 = getCurve(p1_x, p1_y, p2_x, p2_y)
    const curve2 = getCurve(p4_x, p4_y, p3_x, p3_y)

    const verticalLine1 = `L${p2_x},${p2_y} ${p4_x},${p4_y}`
    const verticalLine2 = `L${p3_x},${p3_y} ${p1_x},${p1_y}`
    const d = `${curve1} ${verticalLine1} ${curve2} ${verticalLine2}`

    const el = document.createElementNS(C.SVG_NS, 'path')
    el.setAttribute('d', d)
    el.setAttribute('class', this.options.classes.connector ?? '')
    this.gutterSVG?.appendChild(el)
  }

  private addCopyArrows(info: DiffInfo, diffIndex: number): void {
    // "Copy to right" arrow: only show if left has content to copy,
    // left.copyLinkEnabled is true, AND the right editor is editable
    if (
      info.leftEndLine > info.leftStartLine &&
      this.options.left.copyLinkEnabled &&
      this.options.right.editable
    ) {
      const arrow = createArrow({
        className: this.options.classes.newCodeConnectorLink ?? '',
        topOffset: info.leftStartLine * this.lineHeight,
        tooltip: 'Copy to right',
        diffIndex,
        arrowContent: this.options.classes.newCodeConnectorLinkContent ?? '',
      })
      this.copyRightContainer?.appendChild(arrow)
    }

    // "Copy to left" arrow: only show if right has content to copy,
    // right.copyLinkEnabled is true, AND the left editor is editable
    if (
      info.rightEndLine > info.rightStartLine &&
      this.options.right.copyLinkEnabled &&
      this.options.left.editable
    ) {
      const arrow = createArrow({
        className: this.options.classes.deletedCodeConnectorLink ?? '',
        topOffset: info.rightStartLine * this.lineHeight,
        tooltip: 'Copy to left',
        diffIndex,
        arrowContent:
          this.options.classes.deletedCodeConnectorLinkContent ?? '',
      })
      this.copyLeftContainer?.appendChild(arrow)
    }
  }

  private positionCopyContainers(): void {
    const leftTopOffset = this.editors.left.ace.getSession().getScrollTop()
    const rightTopOffset = this.editors.right.ace.getSession().getScrollTop()

    if (this.copyRightContainer) {
      this.copyRightContainer.style.cssText = `top: ${-leftTopOffset}px`
    }
    if (this.copyLeftContainer) {
      this.copyLeftContainer.style.cssText = `top: ${-rightTopOffset}px`
    }
  }

  private computeDiff(
    diffType: number,
    offsetLeft: number,
    offsetRight: number,
    diffText: string,
  ): DiffInfo {
    let lineInfo: Partial<DiffInfo> = {}

    if (diffType === DIFF_INSERT) {
      const info = this.getSingleDiffInfo(
        this.editors.left,
        offsetLeft,
        diffText,
      )
      const currentLineOtherEditor = this.getLineForCharPosition(
        this.editors.right,
        offsetRight,
      )
      const numCharsOnLineOtherEditor = this.getCharsOnLine(
        this.editors.right,
        currentLineOtherEditor,
      )
      const numCharsOnLeftEditorStartLine = this.getCharsOnLine(
        this.editors.left,
        info.startLine,
      )

      const rightStartLine = currentLineOtherEditor
      const sameLineInsert = info.startLine === info.endLine

      let numRows = 0
      if (
        (info.startChar > 0 ||
          (sameLineInsert &&
            diffText.length < numCharsOnLeftEditorStartLine)) &&
        numCharsOnLineOtherEditor > 0 &&
        info.startChar < numCharsOnLeftEditorStartLine
      ) {
        numRows++
      }

      lineInfo = {
        leftStartLine: info.startLine,
        leftEndLine: info.endLine + 1,
        rightStartLine,
        rightEndLine: rightStartLine + numRows,
        leftStartOffset: offsetLeft,
        leftEndOffset: offsetLeft + diffText.length,
        rightStartOffset: offsetRight,
        rightEndOffset: offsetRight,
        leftStartChar: info.startChar,
        leftEndChar: info.endChar,
      }
    } else {
      const info = this.getSingleDiffInfo(
        this.editors.right,
        offsetRight,
        diffText,
      )
      const currentLineOtherEditor = this.getLineForCharPosition(
        this.editors.left,
        offsetLeft,
      )
      const numCharsOnLineOtherEditor = this.getCharsOnLine(
        this.editors.left,
        currentLineOtherEditor,
      )
      const numCharsOnRightEditorStartLine = this.getCharsOnLine(
        this.editors.right,
        info.startLine,
      )

      const leftStartLine = currentLineOtherEditor
      const sameLineInsert = info.startLine === info.endLine

      let numRows = 0
      if (
        (info.startChar > 0 ||
          (sameLineInsert &&
            diffText.length < numCharsOnRightEditorStartLine)) &&
        numCharsOnLineOtherEditor > 0 &&
        info.startChar < numCharsOnRightEditorStartLine
      ) {
        numRows++
      }

      lineInfo = {
        leftStartLine,
        leftEndLine: leftStartLine + numRows,
        rightStartLine: info.startLine,
        rightEndLine: info.endLine + 1,
        leftStartOffset: offsetLeft,
        leftEndOffset: offsetLeft,
        rightStartOffset: offsetRight,
        rightEndOffset: offsetRight + diffText.length,
        rightStartChar: info.startChar,
        rightEndChar: info.endChar,
      }
    }

    return lineInfo as DiffInfo
  }

  private getSingleDiffInfo(
    editor: EditorInstance,
    offset: number,
    diffString: string,
  ): {
    startLine: number
    startChar: number
    endLine: number
    endChar: number
  } {
    const info = {
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 0,
    }
    const endCharNum = offset + diffString.length
    let runningTotal = 0
    let startLineSet = false
    let endLineSet = false

    editor.lineLengths.forEach((lineLength, lineIndex) => {
      runningTotal += lineLength

      if (!startLineSet && offset < runningTotal) {
        info.startLine = lineIndex
        info.startChar = offset - runningTotal + lineLength
        startLineSet = true
      }

      if (!endLineSet && endCharNum <= runningTotal) {
        info.endLine = lineIndex
        info.endChar = endCharNum - runningTotal + lineLength
        endLineSet = true
      }
    })

    if (
      info.startChar > 0 &&
      this.getCharsOnLine(editor, info.startLine) === info.startChar
    ) {
      info.startLine++
      info.startChar = 0
    }

    if (info.endChar === 0) {
      info.endLine--
    }

    const endsWithNewline = /\n$/.test(diffString)
    if (info.startChar > 0 && endsWithNewline) {
      info.endLine++
    }

    return info
  }

  private getCharsOnLine(editor: EditorInstance, line: number): number {
    return getLine(editor, line).length
  }

  private getLineForCharPosition(
    editor: EditorInstance,
    offsetChars: number,
  ): number {
    const lines: string[] = editor.ace.getSession().doc.getAllLines()
    let foundLine = 0
    let runningTotal = 0

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      if (line !== undefined) {
        runningTotal += line.length + 1
      }
      if (offsetChars <= runningTotal) {
        foundLine = i
        if (offsetChars === runningTotal && i < lines.length - 1) {
          foundLine += 1
        }
        break
      }
    }

    if (runningTotal >= editor.ace.getSession().getValue().length) {
      foundLine += 1
    }

    return foundLine
  }

  private createGutter(): void {
    const gutterEl = document.getElementById(this.options.classes.gutterID!)
    if (!gutterEl) return

    this.gutterHeight = gutterEl.clientHeight
    this.gutterWidth = gutterEl.clientWidth

    const leftHeight = this.getTotalHeight(EDITOR_LEFT)
    const rightHeight = this.getTotalHeight(EDITOR_RIGHT)
    const height = Math.max(leftHeight, rightHeight, this.gutterHeight)

    this.gutterSVG = document.createElementNS(C.SVG_NS, 'svg')
    this.gutterSVG.setAttribute('width', String(this.gutterWidth))
    this.gutterSVG.setAttribute('height', String(height))

    gutterEl.appendChild(this.gutterSVG)
  }

  private getTotalHeight(editor: EditorSide): number {
    const ed = editor === EDITOR_LEFT ? this.editors.left : this.editors.right
    return ed.ace.getSession().getLength() * this.lineHeight
  }

  private createCopyContainers(): void {
    this.copyRightContainer = document.createElement('div')
    this.copyRightContainer.setAttribute(
      'class',
      this.options.classes.copyRightContainer ?? '',
    )
    this.copyLeftContainer = document.createElement('div')
    this.copyLeftContainer.setAttribute(
      'class',
      this.options.classes.copyLeftContainer ?? '',
    )

    const gutterEl = document.getElementById(this.options.classes.gutterID!)
    if (gutterEl) {
      gutterEl.appendChild(this.copyRightContainer)
      gutterEl.appendChild(this.copyLeftContainer)
    }
  }

  private clearGutter(): void {
    const gutterEl = document.getElementById(this.options.classes.gutterID!)
    if (gutterEl && this.gutterSVG) {
      gutterEl.removeChild(this.gutterSVG)
    }
    this.createGutter()
  }

  private clearArrows(): void {
    if (this.copyLeftContainer) {
      this.copyLeftContainer.innerHTML = ''
    }
    if (this.copyRightContainer) {
      this.copyRightContainer.innerHTML = ''
    }
  }

  private simplifyDiffs(diffs: DiffInfo[]): DiffInfo[] {
    const groupedDiffs: DiffInfo[] = []

    const compare = (val: number): boolean =>
      this.options.diffGranularity === DIFF_GRANULARITY_SPECIFIC
        ? val < 1
        : val <= 1

    const createDiffWithChars = (diff: Partial<DiffInfo>): DiffInfo => {
      const newDiff: DiffInfo = {
        ...diff,
        leftChars: [],
        rightChars: [],
      } as DiffInfo

      if (diff.leftEndChar !== undefined) {
        newDiff.leftChars.push({
          start: diff.leftStartChar ?? 0,
          end: diff.leftEndChar,
          lineStart: diff.leftStartLine ?? 0,
          lineEnd: diff.leftEndLine ?? 0,
        })
      }
      if (diff.rightEndChar !== undefined) {
        newDiff.rightChars.push({
          start: diff.rightStartChar ?? 0,
          end: diff.rightEndChar,
          lineStart: diff.rightStartLine ?? 0,
          lineEnd: diff.rightEndLine ?? 0,
        })
      }
      return newDiff
    }

    diffs.forEach((diff, index) => {
      if (index === 0) {
        groupedDiffs.push(createDiffWithChars(diff))
        return
      }

      let isGrouped = false
      for (let i = 0; i < groupedDiffs.length; i += 1) {
        if (
          compare(
            Math.abs(diff.leftStartLine - groupedDiffs[i]!.leftEndLine),
          ) &&
          compare(Math.abs(diff.rightStartLine - groupedDiffs[i]!.rightEndLine))
        ) {
          groupedDiffs[i]!.leftStartLine = Math.min(
            diff.leftStartLine,
            groupedDiffs[i]!.leftStartLine,
          )
          groupedDiffs[i]!.rightStartLine = Math.min(
            diff.rightStartLine,
            groupedDiffs[i]!.rightStartLine,
          )
          groupedDiffs[i]!.leftEndLine = Math.max(
            diff.leftEndLine,
            groupedDiffs[i]!.leftEndLine,
          )
          groupedDiffs[i]!.rightEndLine = Math.max(
            diff.rightEndLine,
            groupedDiffs[i]!.rightEndLine,
          )
          groupedDiffs[i]!.leftStartOffset = Math.min(
            diff.leftStartOffset,
            groupedDiffs[i]!.leftStartOffset,
          )
          groupedDiffs[i]!.leftEndOffset = Math.max(
            diff.leftEndOffset,
            groupedDiffs[i]!.leftEndOffset,
          )
          groupedDiffs[i]!.rightStartOffset = Math.min(
            diff.rightStartOffset,
            groupedDiffs[i]!.rightStartOffset,
          )
          groupedDiffs[i]!.rightEndOffset = Math.max(
            diff.rightEndOffset,
            groupedDiffs[i]!.rightEndOffset,
          )

          if (diff.leftEndChar !== undefined) {
            groupedDiffs[i]!.leftChars.push({
              start: diff.leftStartChar ?? 0,
              end: diff.leftEndChar,
              lineStart: diff.leftStartLine,
              lineEnd: diff.leftEndLine,
            })
          }
          if (diff.rightEndChar !== undefined) {
            groupedDiffs[i]!.rightChars.push({
              start: diff.rightStartChar ?? 0,
              end: diff.rightEndChar,
              lineStart: diff.rightStartLine,
              lineEnd: diff.rightEndLine,
            })
          }
          isGrouped = true
          break
        }
      }

      if (!isGrouped) {
        groupedDiffs.push(createDiffWithChars(diff))
      }
    })

    return groupedDiffs.filter(
      (diff) =>
        !(
          diff.leftStartLine === diff.leftEndLine &&
          diff.rightStartLine === diff.rightEndLine
        ),
    )
  }

  private decorate(): void {
    this.clearGutter()
    this.clearArrows()

    this.diffs.forEach((info, diffIndex) => {
      if (this.options.showDiffs) {
        this.showDiff(
          EDITOR_LEFT,
          info.leftStartLine,
          info.leftEndLine,
          info.leftChars,
          this.options.classes.diff ?? '',
        )
        this.showDiff(
          EDITOR_RIGHT,
          info.rightStartLine,
          info.rightEndLine,
          info.rightChars,
          this.options.classes.diff ?? '',
        )

        if (this.options.showConnectors) {
          this.addConnector(
            info.leftStartLine,
            info.leftEndLine,
            info.rightStartLine,
            info.rightEndLine,
          )
        }
        this.addCopyArrows(info, diffIndex)
      }
    })
  }
}
