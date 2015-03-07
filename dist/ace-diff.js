(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require());
  } else {
    root.AceDiff = factory(root);
  }
}(this, function() {
  'use strict';

  var Range = require('ace/range').Range;

  var C = {
    DIFF_EQUAL: 0,
    DIFF_DELETE: -1,
    DIFF_INSERT: 1,
    EDITOR_RIGHT: 'right',
    EDITOR_LEFT: 'left',
    RTL: 'rtl',
    LTR: 'ltr',
    SVG_NS: 'http://www.w3.org/2000/svg'
  };

  // our constructor
  var AceDiff = function(options) {

    this.options = {};
    extend(true, this.options, {
      mode: null,
      lockScrolling: false,
      left: {
        id: 'acediff-left-editor',
        content: null,
        mode: null,
        editable: true,
        showCopyLTR: true
      },
      right: {
        id: 'acediff-right-editor',
        content: null,
        mode: null,
        editable: true,
        showCopyRTL: true
      },
      showDiffs: true,
      showConnectors: true,
      maxDiffs: 5000,
      classes: {
        gutter: 'acediff-gutter',
        diff: 'acediff-diff',
        connector: 'acediff-connector',
        newCodeConnectorLink: 'acediff-new-code-connector-copy',
        newCodeConnectorLinkContent: '&#8594;',
        deletedCodeConnectorLink: 'acediff-deleted-code-connector-copy',
        deletedCodeConnectorLinkContent: '&#8592;',
        copyRightContainer: 'acediff-copy-right',
        copyLeftContainer: 'acediff-copy-left'
      }
    }, options);

    // instantiate the editors in an internal data structure that will store a little info about the diffs and
    // editor content
    this.editors = {
      left: {
        ace: ace.edit(this.options.left.id),
        markers: [],
        lineLengths: []
      },
      right: {
        ace: ace.edit(this.options.right.id),
        markers: [],
        lineLengths: []
      }
    };

    this.addEventHandlers();

    this.lineHeight = this.editors.left.ace.renderer.lineHeight; // assumption: both editors have same line heights
    var $gutter = $("." + this.options.classes.gutter);
    this.gutterHeight = $gutter.height();
    this.gutterWidth = $gutter.width();

    // set up the editors
    this.editors.left.ace.getSession().setMode(this.getMode(C.EDITOR_LEFT));
    this.editors.right.ace.getSession().setMode(this.getMode(C.EDITOR_RIGHT));
    this.editors.left.ace.setReadOnly(!this.options.left.editable);
    this.editors.right.ace.setReadOnly(!this.options.right.editable);

    this.createCopyContainers();
    this.createGutter();

    if (this.options.left.content) {
      this.editors.left.ace.setValue(this.options.left.content, -1);
    }
    if (this.options.right.content) {
      this.editors.right.ace.setValue(this.options.right.content, -1);
    }

    this.diff();
  };


  AceDiff.prototype.addEventHandlers = function () {
    var acediff = this;

    // acediff.options.lockScrolling

    this.editors.left.ace.getSession().on('changeScrollTop', function(scroll) {

      // find the middle line in the left editor
      var info = getScrollingInfo(acediff);
      var halfEditorHeight = info.editorHeight / 2;
      var leftMiddleLine = Math.floor((scroll + halfEditorHeight) / acediff.lineHeight) + 1;

      // now figure out what line SHOULD be in the right editor, taking into account all the deletes/inserts
      var offsets = getDiffRowOffsets(acediff, leftMiddleLine);

      // our default right scroll height is the current scroll height in the left editor + the height of all deletes
      // in the RIGHT editor (surely it should left offsets too?)
      var rightOffsetInPixels = offsets.rightOffset * acediff.lineHeight;
      var rightScrollHeight = parseInt(scroll) + rightOffsetInPixels;

      // the only time we need to do smooth scrolling on the right if when we're in a left diff
      if (offsets.inLeftDiff) {
        var numRowsInLeftDiff = offsets.leftDiffEndLine - offsets.leftDiffStartLine;
        var pixelsOverLeftDiffStart = parseInt(info.editorHeight / 2) + parseInt(scroll) - (offsets.leftDiffStartLine * acediff.lineHeight);
        var ratio = pixelsOverLeftDiffStart / (acediff.lineHeight * numRowsInLeftDiff);

        var hmm = getDiffRowOffsets(acediff, leftMiddleLine + offsets.rightOffset);

        var rightDiffInPixels = (hmm.rightDiffEndLine - hmm.rightDiffStartLine) * acediff.lineHeight;
        var leftDiffInPixels = (offsets.leftDiffEndLine - offsets.leftDiffStartLine) * acediff.lineHeight;

        rightScrollHeight = parseInt(scroll) + (offsets.rightOffset * acediff.lineHeight) + (ratio * rightDiffInPixels) - (ratio * leftDiffInPixels);
      }

      acediff.editors.right.ace.getSession().setScrollTop(rightScrollHeight);

      updateGap(acediff, 'left', scroll);
    });


    this.editors.right.ace.getSession().on('changeScrollTop', function(scroll) {
      updateGap(acediff, 'right', scroll);
    });


    var diff = this.diff.bind(this);
    this.editors.left.ace.on("change", diff);
    this.editors.right.ace.on("change", diff);

    // TODO necessary?
    var onCopy = copy.bind(this);

    if (this.options.left.showCopyLTR) {
      on('.' + this.options.classes.gutter, 'click', '.' + this.options.classes.newCodeConnectorLink, function (e) {
        onCopy(e, C.LTR);
      });
    }
    if (this.options.right.showCopyRTL) {
      on('.' + this.options.classes.gutter, 'click', '.' + this.options.classes.deletedCodeConnectorLink, function (e) {
        onCopy(e, C.RTL);
      });
    }


    var onResize = debounce(function() {
      // TODO this should re-init the acediff to ensure the gutter is the right size
      acediff.diff();
    }, 250);

    window.addEventListener('resize', onResize);
  };


  // rename
  function getDiffRowOffsets(acediff, line) {
    var totalInserts = 0,
        totalDeletes = 0,
        inLeftDiff = false,
        inRightDiff = false;

    var leftDiffStartLine, leftDiffEndLine, rightDiffStartLine, rightDiffEndLine;

    /*
    scenario I want to code for here is this:
    - we've just passed the first 1-line-high diff.
    - we want to return the RIGHT start + end line as though the
    */

    var rightOffset = 0;
    for (var i=0; i<acediff.diffs.length; i++) {
      if (acediff.diffs[i].leftStartLine < line) {
        if (acediff.diffs[i].leftEndLine < line) {
          totalInserts += acediff.diffs[i].leftEndLine - acediff.diffs[i].leftStartLine;
          //  console.log(acediff.diffs[i].rightEndLine - acediff.diffs[i].rightStartLine);

          rightOffset += acediff.diffs[i].rightEndLine - acediff.diffs[i].rightStartLine;
        } else {
          inLeftDiff = true;
          leftDiffStartLine = acediff.diffs[i].leftStartLine;
          leftDiffEndLine = acediff.diffs[i].leftEndLine;
        }
      }

      // problem: this returns TRUE when we have a long diff on the right, even though visually it looks like
      // we've passed it by.
      if (acediff.diffs[i].rightStartLine < line) {
        if (acediff.diffs[i].rightEndLine < line) {
          totalDeletes += acediff.diffs[i].rightEndLine - acediff.diffs[i].rightStartLine;
        } else {
          inRightDiff = true;
          rightDiffStartLine = acediff.diffs[i].rightStartLine;
          rightDiffEndLine = acediff.diffs[i].rightEndLine;
          //console.log(rightDiffStartLine, rightDiffEndLine);
        }
      }
    }

    // the right offset is only ever the
    rightOffset = rightOffset - totalInserts;

    return {
      totalInserts: totalInserts,
      inLeftDiff: inLeftDiff,
      leftDiffStartLine: leftDiffStartLine,
      leftDiffEndLine: leftDiffEndLine,
      totalDeletes: totalDeletes,
      inRightDiff: inRightDiff,
      rightDiffStartLine: rightDiffStartLine,
      rightDiffEndLine: rightDiffEndLine,

      rightOffset: rightOffset
    };
  };


  // this seems woefully inefficient, but since it only occurs on a copy action by the user, I'll refactor it last
  function copy(e, dir) {
    var diffIndex = parseInt(e.target.getAttribute('data-diff-index'), 10);
    var diff = this.diffs[diffIndex];
    var sourceEditor, targetEditor;

    var startLine, endLine, targetStartLine, targetEndLine;
    if (dir === C.LTR) {
      sourceEditor = this.editors.left;
      targetEditor = this.editors.right;
      startLine = diff.leftStartLine;
      endLine = diff.leftEndLine;
      targetStartLine = diff.rightStartLine;
      targetEndLine = diff.rightEndLine;
    } else {
      sourceEditor = this.editors.right;
      targetEditor = this.editors.left;
      startLine = diff.rightStartLine;
      endLine = diff.rightEndLine;
      targetStartLine = diff.leftStartLine;
      targetEndLine = diff.leftEndLine;
    }

    var contentToInsert = '';
    for (var i=startLine; i<endLine; i++) {
      contentToInsert += getLine(sourceEditor, i) + "\n";
    }

    var startContent = '';
    for (var i=0; i<targetStartLine; i++) {
      startContent += getLine(targetEditor, i) + "\n";
    }

    var endContent = '';
    var totalLines = targetEditor.ace.getSession().getLength();
    for (var i=targetEndLine; i<totalLines; i++) {
      endContent += getLine(targetEditor, i);
      if (i<totalLines-1) {
        endContent += "\n";
      }
    }

    endContent = endContent.replace(/\s*$/, "");

    // keep track of the scroll height
    var h = targetEditor.ace.getSession().getScrollTop();
    targetEditor.ace.getSession().setValue(startContent + contentToInsert + endContent);
    targetEditor.ace.getSession().setScrollTop(parseInt(h));

    this.diff();
  }


  // allows on-the-fly changes to the AceDiff instance settings
  AceDiff.prototype.setOptions = function (options) {
    extend(true, this.options, options);
  };


  function getLineLengths(editor) {
    var lines = editor.ace.getSession().doc.getAllLines();
    var lineLengths = [];
    lines.forEach(function(line) {
      lineLengths.push(line.length + 1); // +1 for the newline char
    });
    return lineLengths;
  };


  AceDiff.prototype.getMode = function(editor) {
    var mode = this.options.mode;
    if (editor === C.EDITOR_LEFT && this.options.left.mode !== null) {
      mode = this.options.left.mode;
    }
    if (editor === C.EDITOR_RIGHT && this.options.right.mode !== null) {
      mode = this.options.right.mode;
    }
    return mode;
  };


  /**
   * Shows a diff in one of the two editors.
   */
  AceDiff.prototype.showDiff = function(editor, startLine, endLine, className) {
    var editor = this.editors[editor];

    if (endLine < startLine) { // can this occur? Just in case.
      endLine = startLine;
    }

    var classNames = className + " " + ((endLine > startLine) ? "lines" : "targetOnly");
    endLine--; // because endLine is always + 1

    // to get Ace to highlight the full row we just set the start and end chars to 0 and 1
    editor.markers.push(editor.ace.session.addMarker(new Range(startLine, 0, endLine, 1), classNames, 'fullLine'));
  };


  // our main diffing function
  AceDiff.prototype.diff = function() {

    // start by doing our actual diffs
    var dmp = new diff_match_patch();
    var val1 = this.editors.left.ace.getSession().getValue();
    var val2 = this.editors.right.ace.getSession().getValue();
    var diff = dmp.diff_main(val2, val1);
    dmp.diff_cleanupSemantic(diff);

    this.editors.left.lineLengths  = getLineLengths(this.editors.left);
    this.editors.right.lineLengths = getLineLengths(this.editors.right);

    // parse the raw diff into something a little more palatable
    var diffs = [];
    var offset = {
      left: 0,
      right: 0
    };

    diff.forEach(function(chunk) {
      var chunkType = chunk[0];
      var text = chunk[1];

//      console.log(chunk);

      // oddly, occasionally the algorithm returns a diff with no changes made
      if (text.length === 0) {
        return;
      }
      if (chunkType === C.DIFF_EQUAL) {
        offset.left += text.length;
        offset.right += text.length;
      } else if (chunkType === C.DIFF_DELETE) {
        diffs.push(this.computeDiff(C.DIFF_DELETE, offset.left, offset.right, text));
        offset.right += text.length;

      } else if (chunkType === C.DIFF_INSERT) {
        diffs.push(this.computeDiff(C.DIFF_INSERT, offset.left, offset.right, text));
        offset.left += text.length;
      }
    }, this);

    // simplify our computed diffs; this groups together multiple diffs on subsequent lines
    this.diffs = simplifyDiffs(diffs);

    // if we're dealing with too many diffs, fail silently
    if (this.diffs.length > this.options.maxDiffs) {
      return;
    }

    clearDiffs(this);
    decorate(this);
  };


  AceDiff.prototype.getNumDiffs = function () {
    return this.diffs.length;
  };


  // called onscroll. Updates the gap to ensure the connectors are all lining up
  function updateGap(acediff, editor, scroll) {
    // naaahhh! This just needs to update the contents of the gap, not re-run diffs TODO
    acediff.diff();

    // reposition the copy containers containing all the arrows
    acediff.positionCopyContainers();
  };


  function clearDiffs(acediff) {
    acediff.editors.left.markers.forEach(function (marker) {
      this.editors.left.ace.getSession().removeMarker(marker);
    }, acediff);
    acediff.editors.right.markers.forEach(function (marker) {
      this.editors.right.ace.getSession().removeMarker(marker);
    }, acediff);
  };

  AceDiff.prototype.scrollEditors = function (editor) {
    if (editor === 'left') {
      this.editors.right.ace.getSession().setScrollTop(parseInt(scroll) || 0);
    }
    if (editor === 'right') {
      this.editors.left.ace.getSession().setScrollTop(parseInt(scroll) || 0);
    }
  };


  AceDiff.prototype.addConnector = function(dir, leftStartLine, leftEndLine, rightStartLine, rightEndLine) {
    var leftScrollTop  = this.editors.left.ace.getSession().getScrollTop();
    var rightScrollTop = this.editors.right.ace.getSession().getScrollTop();

    // All connectors, regardless of ltr or rtl have the same point system, even if p1 === p3 or p2 === p4
    //  p1   p2
    //
    //  p3   p4

    var c;
    var p1_x = -1;
    var p2_x = this.gutterWidth + 1;
    var p3_x = -1;
    var p4_x = this.gutterWidth + 1;

    if (dir === C.LTR) {
      var p1_y = (leftStartLine * this.lineHeight) - leftScrollTop;
      var p2_y = rightStartLine * this.lineHeight - rightScrollTop;
      var p3_y = (leftEndLine * this.lineHeight) - leftScrollTop;
      var p4_y = (rightEndLine * this.lineHeight) - rightScrollTop;
      var curve1 = getCurve(p1_x, p1_y, p2_x, p2_y);
      var curve2 = getCurve(p4_x, p4_y, p3_x, p3_y);
      c = this.options.classes.connector;
    } else {
      var p1_y = (targetStartLine * this.lineHeight) - leftScrollTop;
      var p2_y = sourceStartLine * this.lineHeight - rightScrollTop;
      var p3_y = (targetStartLine * this.lineHeight) + (targetNumRows * this.lineHeight) - leftScrollTop;
      var p4_y = (sourceEndLine * this.lineHeight) + this.lineHeight - rightScrollTop;
      var curve1 = getCurve(p1_x, p1_y, p2_x, p2_y);
      var curve2 = getCurve(p4_x, p4_y, p3_x, p3_y);
      c = this.options.classes.connector;
    }

    var verticalLine1 = 'L' + p2_x + "," + p2_y + " " + p4_x + "," + p4_y;
    var verticalLine2 = 'L' + p3_x + "," + p3_y + " " + p1_x + "," + p1_y;
    var d = curve1 + ' ' + verticalLine1 + ' ' + curve2 + ' ' + verticalLine2;

    var gutterSVG = $("." + this.options.classes.gutter + " svg")[0];

    var el = document.createElementNS(C.SVG_NS, "path");
    el.setAttribute("d", d);
    el.setAttribute("class", c);
    gutterSVG.appendChild(el);
  };


  AceDiff.prototype.addCopyArrows = function(info, diffIndex) {
    if (info.leftEndLine > info.leftStartLine) {
      var arrow = createArrow({
        className: this.options.classes.newCodeConnectorLink,
        topOffset: info.leftStartLine * this.lineHeight,
        tooltip: 'Copy to right',
        diffIndex: diffIndex,
        arrowContent: this.options.classes.newCodeConnectorLinkContent
      });
      $('.' + this.options.classes.copyRightContainer).append(arrow);
    }

    if (info.rightEndLine > info.rightStartLine) {
      var arrow = createArrow({
        className: this.options.classes.deletedCodeConnectorLink,
        topOffset: info.rightStartLine * this.lineHeight,
        tooltip: 'Copy to left',
        diffIndex: diffIndex,
        arrowContent: this.options.classes.deletedCodeConnectorLinkContent
      });
      $('.' + this.options.classes.copyLeftContainer).append(arrow);
    }
  };

  AceDiff.prototype.positionCopyContainers = function () {
    var leftTopOffset = this.editors.left.ace.getSession().getScrollTop();
    var rightTopOffset = this.editors.right.ace.getSession().getScrollTop();

    $("." + this.options.classes.copyRightContainer).css({ top: -leftTopOffset + 'px' });
    $("." + this.options.classes.copyLeftContainer).css({ top: -rightTopOffset + 'px' });
  };


  /**
   * This method takes the raw diffing info from the Google lib and returns a nice clean object of the following
   * form:
   * {
   *   leftStartLine:
   *   leftEndLine:
   *   rightStartLine:
   *   rightEndLine:
   * }
   *
   * Ultimately, that's all the info we need to highlight the appropriate lines in the left + right editor, add the
   * SVG connectors, and include the appropriate <<, >> arrows.
   *
   * Note: leftEndLine and rightEndLine are always the start of the NEXT line, so for a single line diff, there will
   * be 1 separating the startLine and endLine values. So if leftStartLine === leftEndLine or rightStartLine ===
   * rightEndLine, it means that new content from the other editor is being inserted and a single 1px line will be
   * drawn.
   */
  AceDiff.prototype.computeDiff = function(diffType, offsetLeft, offsetRight, diffText) {
    var lineInfo = {};

    // this was added in to hack around an oddity with the Google lib. Sometimes it would include a newline
    // as the first char for a diff, other times not - and it would change when you were typing on-the-fly. This
    // is used to level things out so the diffs don't appear to shift around
    var newContentStartsWithNewline = /^\n/.test(diffText);

    if (diffType === C.DIFF_INSERT) {

      // pretty confident this returns the right stuff for the left editor: start & end line & char
      var info = getSingleDiffInfo(this.editors.left, offsetLeft, diffText);

      // this is the ACTUAL undoctored current line in the other editor. It's always right. Doesn't mean it's
      // going to be used as the start line for the diff though.
      var currentLineOtherEditor = getLineForCharPosition(this.editors.right, offsetRight);
      var numCharsOnLineOtherEditor = getCharsOnLine(this.editors.right, currentLineOtherEditor);
      var numCharsOnLeftEditorStartLine = getCharsOnLine(this.editors.left, info.startLine);
      var numCharsOnLine = getCharsOnLine(this.editors.left, info.startLine);

      // this is necessary because if a new diff starts on the FIRST char of the left editor, the diff can comes
      // back from google as being on the last char of the previous line so we need to bump it up one
      var rightStartLine = currentLineOtherEditor;
      if (numCharsOnLine === 0 && newContentStartsWithNewline) {
        newContentStartsWithNewline = false;
      }
      if (info.startChar === 0 && isLastChar(this.editors.right, offsetRight, newContentStartsWithNewline)) {
        rightStartLine = currentLineOtherEditor + 1;
      }

      var sameLineInsert = info.startLine === info.endLine;

      // whether or not this diff is a plain INSERT into the other editor, or overwrites a line take a little work to
      // figure out. This feels like the hardest part of the entire script.
      var numRows = 0;
      if (

        // dense, but this accommodates two scenarios:
        // 1. where a completely fresh new line is being inserted in left editor, we want the line on right to stay a 1px line
        // 2. where a new character is inserted at the start of a newline on the left but the line contains other stuff,
        //    we DO want to make it a full line
        (info.startChar > 0 || (sameLineInsert && diffText.length < numCharsOnLeftEditorStartLine)) &&

        // if the right editor line was empty, it's ALWAYS a single line insert [not an OR above?]
        numCharsOnLineOtherEditor > 0 &&

        // if the text being inserted starts mid-line
        (info.startChar < numCharsOnLeftEditorStartLine)) {
        numRows++;
      }

      lineInfo = {
        leftStartLine: info.startLine,
        leftEndLine: info.endLine + 1,
        rightStartLine: rightStartLine,
        rightEndLine: rightStartLine + numRows
      };

    } else {
      var info = getSingleDiffInfo(this.editors.right, offsetRight, diffText);

      var currentLineOtherEditor = getLineForCharPosition(this.editors.left, offsetLeft);
      var numCharsOnLineOtherEditor = getCharsOnLine(this.editors.left, currentLineOtherEditor);
      var numCharsOnRightEditorStartLine = getCharsOnLine(this.editors.right, info.startLine);
      var numCharsOnLine = getCharsOnLine(this.editors.right, info.startLine);

      // this is necessary because if a new diff starts on the FIRST char of the left editor, the diff can comes
      // back from google as being on the last char of the previous line so we need to bump it up one
      var leftStartLine = currentLineOtherEditor;
      if (numCharsOnLine === 0 && newContentStartsWithNewline) {
        newContentStartsWithNewline = false;
      }
      if (info.startChar === 0 && isLastChar(this.editors.left, offsetLeft, newContentStartsWithNewline)) {
        leftStartLine = currentLineOtherEditor + 1;
      }

      var sameLineInsert = info.startLine === info.endLine;
      var numRows = 0;
      if (

        // dense, but this accommodates two scenarios:
        // 1. where a completely fresh new line is being inserted in left editor, we want the line on right to stay a 1px line
        // 2. where a new character is inserted at the start of a newline on the left but the line contains other stuff,
        //    we DO want to make it a full line
        (info.startChar > 0 || (sameLineInsert && diffText.length < numCharsOnRightEditorStartLine)) &&

          // if the right editor line was empty, it's ALWAYS a single line insert [not an OR above?]
        numCharsOnLineOtherEditor > 0 &&

          // if the text being inserted starts mid-line
        (info.startChar < numCharsOnRightEditorStartLine)) {
          numRows++;
      }

      lineInfo = {
        leftStartLine: leftStartLine,
        leftEndLine: leftStartLine + numRows,
        rightStartLine: info.startLine,
        rightEndLine: info.endLine + 1
      };
    }

    return lineInfo;
  };


  // helper to return the startline, endline, startChar and endChar for a diff in a particular editor
  function getSingleDiffInfo(editor, offset, diffString) {
    var info = {
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 0
    };
    var endCharNum = offset + diffString.length;
    var runningTotal = 0;
    var startLineSet = false,
        endLineSet = false;

    editor.lineLengths.forEach(function(lineLength, lineIndex) {
      runningTotal += lineLength;

      if (!startLineSet && offset < runningTotal) {
        info.startLine = lineIndex;
        info.startChar = offset - runningTotal + lineLength;
        startLineSet = true;
      }

      if (!endLineSet && endCharNum <= runningTotal) {
        info.endLine = lineIndex;
        info.endChar = endCharNum - runningTotal + lineLength;
        endLineSet = true;
      }
    });

    // if the start char is the final char on the line, it's a newline & we ignore it
    if (info.startChar > 0 && getCharsOnLine(editor, info.startLine) === info.startChar) {
      info.startLine++;
      info.startChar = 0;
    }

    // if the end char is the first char on the line, we don't want to highlight that extra line
    if (info.endChar === 0) {
      info.endLine--;
    }

    var endsWithNewline = /\n$/.test(diffString);
    if (info.startChar > 0 && endsWithNewline) {
      info.endLine++;
    }

    return info;
  }


  // note that this and everything else in this script uses 0-indexed row numbers
  function getCharsOnLine(editor, line) {
    return getLine(editor, line).length;
  }

  function getLine(editor, line) {
    return editor.ace.getSession().doc.getLine(line);
  }

  function getLineForCharPosition(editor, offsetChars) {
    var lines = editor.ace.getSession().doc.getAllLines(),
        foundLine = 0,
        runningTotal = 0;

    for (var i=0; i<lines.length; i++) {
      var lineLength = lines[i].length + 1; // +1 needed for newline char
      runningTotal += lineLength;

      //if (i===lines.length-1 && offsetChars === runningTotal-1) {
      //  foundLine = i+1;
      //  break;
      //} else {

      if (offsetChars <= runningTotal) {
        foundLine = i;
        break;
      }
    }
    return foundLine;
  }


  function isLastChar(editor, char, startsWithNewline) {
    var lines = editor.ace.getSession().doc.getAllLines(),
        runningTotal = 0,
        isLastChar = false;

    for (var i=0; i<lines.length; i++) {
      var lineLength = lines[i].length + 1; // +1 needed for newline char

      runningTotal += lineLength;

      // we MUST compare it with - 1, since char
      var comparison = runningTotal;
      if (startsWithNewline) {
        comparison--;
      }

      if (char === comparison) {
        isLastChar = true;
        break;
      }
    }
    return isLastChar;
  }

  function createArrow(info) {
    return '<div class="' + info.className + '" style="top:' + info.topOffset + 'px" title="' + info.tooltip + '" ' +
      'data-diff-index="' + info.diffIndex + '">' + info.arrowContent + '</div>';
  }

  AceDiff.prototype.createGutter = function() {
    var leftHeight = this.editors.left.ace.getSession().getLength() * this.lineHeight;
    var rightHeight = this.editors.right.ace.getSession().getLength() * this.lineHeight;
    var height = Math.max(leftHeight, rightHeight, this.gutterHeight);

    var svg = document.createElementNS(C.SVG_NS, 'svg');
    svg.setAttribute('width', this.gutterWidth);
    svg.setAttribute('height', height);

    // TODO
    $("." + this.options.classes.gutter).append(svg);
  };

  // this creates two contains for the copy left + copy right arrows
  AceDiff.prototype.createCopyContainers = function() {
    $("." + this.options.classes.gutter)
      .append('<div class="' + this.options.classes.copyRightContainer + '"></div>')
      .append('<div class="' + this.options.classes.copyLeftContainer + '"></div>');
  };

  function clearGutter(el) {
    $("." + el + " svg").empty();
  }

  AceDiff.prototype.clearArrows = function() {
    $("." + this.options.classes.copyLeftContainer + ", ." + this.options.classes.copyRightContainer).empty();
  };

  /*
   * This combines multiple rows where, say, line 1 => line 1, line 2 => line 2, line 3-4 => line 3. That could be
   * reduced to a single connector line 1=4 => line 1-3
   */
  function simplifyDiffs(diffs) {
    var groupedDiffs = [];

    diffs.forEach(function(diff, index) {
      if (index === 0) {
        groupedDiffs.push(diff);
        return;
      }

      // loop through all grouped diffs. If this new diff lies between an existing one, we'll just add to it, rather
      // than create a new one
      var isGrouped = false;
      for (var i=0; i<groupedDiffs.length; i++) {
        if ((Math.abs(diff.leftStartLine - groupedDiffs[i].leftEndLine) < 1) &&
            (Math.abs(diff.rightStartLine - groupedDiffs[i].rightEndLine) < 1)) {

          // update the existing grouped diff to expand its horizons to include this new diff start + end lines
          groupedDiffs[i].leftStartLine = Math.min(diff.leftStartLine, groupedDiffs[i].leftStartLine);
          groupedDiffs[i].rightStartLine = Math.min(diff.rightStartLine, groupedDiffs[i].rightStartLine);
          groupedDiffs[i].leftEndLine = Math.max(diff.leftEndLine, groupedDiffs[i].leftEndLine);
          groupedDiffs[i].rightEndLine = Math.max(diff.rightEndLine, groupedDiffs[i].rightEndLine);
          isGrouped = true;
          break;
        }
      }

      if (!isGrouped) {
        groupedDiffs.push(diff);
      }
    });

    // clear out any single line diffs (i.e. single line on both editors)
    var fullDiffs = [];
    groupedDiffs.forEach(function(diff) {
      if (diff.leftStartLine === diff.leftEndLine && diff.rightStartLine === diff.rightEndLine) {
        return;
      }
      fullDiffs.push(diff);
    });

    return fullDiffs;
  }


  function decorate(acediff) {
    clearGutter(acediff.options.classes.gutter);

    acediff.clearArrows();
    acediff.diffs.forEach(function(info, diffIndex) {
      if (this.options.showDiffs) {
        this.showDiff(C.EDITOR_LEFT, info.leftStartLine, info.leftEndLine, this.options.classes.diff);
        this.showDiff(C.EDITOR_RIGHT, info.rightStartLine, info.rightEndLine, this.options.classes.diff);

        if (this.options.showConnectors) {
          this.addConnector(C.LTR, info.leftStartLine, info.leftEndLine, info.rightStartLine, info.rightEndLine);
        }
        this.addCopyArrows(info, diffIndex);
      }
    }, acediff);
  };


  // taken from jQuery
  function extend() {
    var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
      i = 1,
      length = arguments.length,
      deep = false,
      toString = Object.prototype.toString,
      hasOwn = Object.prototype.hasOwnProperty,
      class2type = {
        "[object Boolean]": "boolean",
        "[object Number]": "number",
        "[object String]": "string",
        "[object Function]": "function",
        "[object Array]": "array",
        "[object Date]": "date",
        "[object RegExp]": "regexp",
        "[object Object]": "object"
      },

      jQuery = {
        isFunction: function (obj) {
          return jQuery.type(obj) === "function";
        },
        isArray: Array.isArray ||
        function (obj) {
          return jQuery.type(obj) === "array";
        },
        isWindow: function (obj) {
          return obj !== null && obj === obj.window;
        },
        isNumeric: function (obj) {
          return !isNaN(parseFloat(obj)) && isFinite(obj);
        },
        type: function (obj) {
          return obj === null ? String(obj) : class2type[toString.call(obj)] || "object";
        },
        isPlainObject: function (obj) {
          if (!obj || jQuery.type(obj) !== "object" || obj.nodeType) {
            return false;
          }
          try {
            if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
              return false;
            }
          } catch (e) {
            return false;
          }
          var key;
          for (key in obj) {}
          return key === undefined || hasOwn.call(obj, key);
        }
      };
    if (typeof target === "boolean") {
      deep = target;
      target = arguments[1] || {};
      i = 2;
    }
    if (typeof target !== "object" && !jQuery.isFunction(target)) {
      target = {};
    }
    if (length === i) {
      target = this;
      --i;
    }
    for (i; i < length; i++) {
      if ((options = arguments[i]) !== null) {
        for (name in options) {
          src = target[name];
          copy = options[name];
          if (target === copy) {
            continue;
          }
          if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && jQuery.isArray(src) ? src : [];
            } else {
              clone = src && jQuery.isPlainObject(src) ? src : {};
            }
            // WARNING: RECURSION
            target[name] = extend(deep, clone, copy);
          } else if (copy !== undefined) {
            target[name] = copy;
          }
        }
      }
    }

    return target;
  }


  // helper to return pertinent info about
  function getScrollingInfo(acediff) {
    return {
      leftScrollTop: acediff.editors.left.ace.getSession().getScrollTop(),
      rightScrollTop: acediff.editors.right.ace.getSession().getScrollTop(),

      // assumed same for both
      editorHeight: $("#" + acediff.options.left.id).height()
    };
  }

  // generates a Bezier curve in SVG format
  function getCurve(startX, startY, endX, endY) {
    var w = endX - startX;
    var halfWidth = startX + (w / 2);

    // position it at the initial x,y coords
    var curve = "M " + startX + " " + startY +

      // now create the curve. This is of the form "C M,N O,P Q,R" where C is a directive for SVG ("curveto"),
      // M,N are the first curve control point, O,P the second control point and Q,R are the final coords
      " C " + halfWidth + "," + startY + " " + halfWidth + "," + endY + " " + endX + "," + endY;

    return curve;
  }


  // IE-friendly? Doesn't look it
  function on(elSelector, eventName, selector, fn) {
    var element = document.querySelector(elSelector);

    element.addEventListener(eventName, function(event) {
      var possibleTargets = element.querySelectorAll(selector);
      var target = event.target;

      for (var i = 0, l = possibleTargets.length; i < l; i++) {
        var el = target;
        var p = possibleTargets[i];

        while(el && el !== element) {
          if (el === p) {
            return fn.call(p, event);
          }
          el = el.parentNode;
        }
      }
    });
  }

  function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  };

  return AceDiff;

}));
