/*!
 * ace-diff
 * @author Ben Keen
 * @version 0.1.0
 * @date Feb 26 2015
 * @repo http://github.com/benkeen/ace-diff
 */
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
      element: null,
      mode: null,
      lockScrolling: false,
      left: {
        id: 'acediff-left-editor',
        content: null,
        mode: null,
        editable: true,
        showDiffs: true,
        showCopyLTR: true,
        showLTRConnectors: true
      },
      right: {
        id: 'acediff-right-editor',
        content: null,
        mode: null,
        editable: true,
        showDiffs: true,
        showCopyRTL: true,
        showRTLConnectors: true
      },
      maxDiffs: 5000,
      classes: {
        gutter: 'acediff-gutter',
        newCode: 'acediff-new-code',
        newCodeConnector: 'acediff-new-code-connector',
        newCodeConnectorLink: 'acediff-new-code-connector-copy',
        newCodeConnectorLinkContent: '&#8594;',
        deletedCode: 'acediff-deleted-code',
        deletedCodeConnector: 'acediff-deleted-code-connector',
        deletedCodeConnectorLink: 'acediff-deleted-code-connector-copy',
        deletedCodeConnectorLinkContent: '&#8592;',
        copyRightContainer: 'acediff-copy-right',
        copyLeftContainer: 'acediff-copy-left'
      }
    }, options);

    // instantiate the editors in an internal data structure that'll store a little info about the diffs and
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

    // TODO
    //this.createDiffContainer();

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

    this.diff();
  };


  AceDiff.prototype.addEventHandlers = function () {
    var updateGap = this.updateGap.bind(this);

    //var re = this.editors.right.ace;
    this.editors.left.ace.getSession().on('changeScrollTop', function(scroll) {
      updateGap('left', scroll);
    });

    this.editors.right.ace.getSession().on('changeScrollTop', function(scroll) {
      //console.log(re.getFirstVisibleRow());
      updateGap('right', scroll);
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
  };


  // this seems woefully inefficient, but since it only occurs on a copy action by the user, I'll refactor it last
  function copy(e, dir) {
    var diffIndex = parseInt(e.target.getAttribute('data-diff-index'), 10);
    var diff = this.diffs[dir][diffIndex];
    var sourceEditor, targetEditor;

    if (dir === C.LTR) {
      sourceEditor = this.editors.left;
      targetEditor = this.editors.right;
    } else {
      sourceEditor = this.editors.right;
      targetEditor = this.editors.left;
    }

    // probably should be an array for speed (is that still correct in mod browsers?)
    var contentToInsert = '';
    for (var i=diff.sourceStartLine; i<=diff.sourceEndLine; i++) {
      contentToInsert += getLine(sourceEditor, i) + "\n";
    }

    var startContent = '';
    for (var i=0; i<diff.targetStartLine; i++) {
      startContent += getLine(targetEditor, i) + "\n";
    }

    var endContent = '';
    var totalLines = targetEditor.ace.getSession().getLength();
    for (var i=diff.targetStartLine+diff.targetNumRows; i<totalLines; i++) {
      endContent += getLine(targetEditor, i) + "\n";
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


  AceDiff.prototype.getLineLengths = function(editor) {
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
   * @param editor
   * @param startLine the 0-indexed start line
   * @param numRows the number of rows to highlight. 0 means just a line will appear
   * @param highlightClass
   */
  AceDiff.prototype.showDiff = function(editor, startLine, numRows, className) {
    var editor = this.editors[editor];

    var endLine = (startLine + numRows) - 1;
    if (endLine < startLine) {
      endLine = startLine;
    }
    var classNames = className;
    if (numRows === 0) {
      classNames += " targetOnly";
    } else {
      classNames += " lines";
    }

    // the start/end chars don't matter. We always highlight the full row. So we just sent them to 0 and 1
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

    this.editors.left.lineLengths  = this.getLineLengths(this.editors.left);
    this.editors.right.lineLengths = this.getLineLengths(this.editors.right);

    // parse the raw diff into something a little more palatable
    var diffs = { rtl: [], ltr: [] };
    var offset = {
      left: 0,
      right: 0
    };

    diff.forEach(function(chunk) {
      var chunkType = chunk[0];
      var text = chunk[1];

      // oddly, occasionally the algorithm returns a diff with no changes made
      if (text.length === 0) {
        return;
      }

      if (chunkType === C.DIFF_EQUAL) {
        offset.left += text.length;
        offset.right += text.length;
      } else if (chunkType === C.DIFF_DELETE) {
        diffs.rtl.push(this.computeDiff(C.DIFF_DELETE, offset.left, offset.right, text.length));
        offset.right += text.length;
      } else if (chunkType === C.DIFF_INSERT) {
        diffs.ltr.push(this.computeDiff(C.DIFF_INSERT, offset.left, offset.right, text.length));
        offset.left += text.length;
      }
    }, this);

    // simplify our computed diffs (i.e. this groups together multiple diffs, if possible), and store it for later use
    this.diffs = simplifyDiffs(diffs);

    // remove conflicting diffs
    this.diffs = dropConflictingDiffs(this.diffs);

    // if we're dealing with too many diffs, fail silently
    if (this.diffs.ltr.length + this.diffs.rtl.length > this.options.maxDiffs) {
      return;
    }

    this.clearMarkers();
    this.decorate(this.diffs);
  };


  AceDiff.prototype.getNumDiffs = function () {
    return {
      rtl: this.diffs.ltr.length,
      ltr: this.diffs.ltr.length
    }
  };


  // called onscroll. Updates the gap to ensure the connectors are all lining up
  AceDiff.prototype.updateGap = function(editor, scroll) {

    // needs to take into account the diffs
    if (this.options.lockScrolling) {
      if (editor === 'left') {
        this.editors.right.ace.getSession().setScrollTop(parseInt(scroll) || 0);
      }
      if (editor === 'right') {
        this.editors.left.ace.getSession().setScrollTop(parseInt(scroll) || 0);
      }
    }

    // naaahhh! This just needs to update the contents of the gap, not re-run diffs TODO
    this.diff();

    // reposition the copy containers containing all the arrows
    this.positionCopyContainers();
  };


  // diffs are implemented as "markers" in Ace terminology
  AceDiff.prototype.clearMarkers = function() {
    this.editors.left.markers.forEach(function (marker) {
      this.editors.left.ace.getSession().removeMarker(marker);
    }, this);
    this.editors.right.markers.forEach(function (marker) {
      this.editors.right.ace.getSession().removeMarker(marker);
    }, this);
  };


  AceDiff.prototype.addConnector = function(dir, sourceStartLine, sourceEndLine, targetStartLine, targetNumRows) {
    var leftScrollTop  = this.editors.left.ace.getSession().getScrollTop();
    var rightScrollTop = this.editors.right.ace.getSession().getScrollTop();

    // All connectors, regardless of ltr or rtl have the same point system, even if p1 === p3 or p2 === p4
    //  p1   p2
    //
    //  p3   p4

    var d, c;
    if (dir === C.LTR) {

      var p1_x = -1;
      var p1_y = (sourceStartLine * this.lineHeight) - leftScrollTop + 1;
      var p2_x = this.gutterWidth + 1;
      var p2_y = targetStartLine * this.lineHeight - rightScrollTop + 1;
      var p3_x = -1;
      var p3_y = (sourceEndLine * this.lineHeight) + this.lineHeight - leftScrollTop + 1;
      var p4_x = this.gutterWidth + 1;
      var p4_y = (targetStartLine * this.lineHeight) + (targetNumRows * this.lineHeight) - rightScrollTop + 1;
      var curve1 = getCurve(p1_x, p1_y, p2_x, p2_y);
      var curve2 = getCurve(p4_x, p4_y, p3_x, p3_y);
      var verticalLine1 = 'L' + p2_x + "," + p2_y + " " + p4_x + "," + p4_y;
      var verticalLine2 = 'L' + p3_x + "," + p3_y + " " + p1_x + "," + p1_y;
      d = curve1 + ' ' + verticalLine1 + ' ' + curve2 + ' ' + verticalLine2;
      c = this.options.classes.newCodeConnector;

    } else {

      var p1_x = -1;
      var p1_y = (targetStartLine * this.lineHeight) - leftScrollTop + 1;
      var p2_x = this.gutterWidth + 1;
      var p2_y = sourceStartLine * this.lineHeight - rightScrollTop + 1;
      var p3_x = -1;
      var p3_y = (targetStartLine * this.lineHeight) + (targetNumRows * this.lineHeight) - leftScrollTop + 1;
      var p4_x = this.gutterWidth + 1;
      var p4_y = (sourceEndLine * this.lineHeight) + this.lineHeight - rightScrollTop + 1;
      var curve1 = getCurve(p1_x, p1_y, p2_x, p2_y);
      var curve2 = getCurve(p4_x, p4_y, p3_x, p3_y);
      var verticalLine1 = 'L' + p2_x + "," + p2_y + " " + p4_x + "," + p4_y;
      var verticalLine2 = 'L' + p3_x + "," + p3_y + " " + p1_x + "," + p1_y;

      d = curve1 + ' ' + verticalLine1 + ' ' + curve2 + ' ' + verticalLine2;
      c = this.options.classes.deletedCodeConnector;
    }

    var gutterSVG = $("." + this.options.classes.gutter + " svg")[0];

    // need to
    var el = document.createElementNS(C.SVG_NS, "path");
    el.setAttribute("d", d);
    el.setAttribute("class", c);
    gutterSVG.appendChild(el);
  };


  AceDiff.prototype.addCopyArrows = function(dir, info, diffIndex) {
    var arrowClassName = this.options.classes.newCodeConnectorLink;
    var arrowContent   = this.options.classes.newCodeConnectorLinkContent;

    // regardless of direction, sourceStartLine will be the one we're interested in
    var topOffset = info.sourceStartLine * this.lineHeight;
    var tooltip = "Copy to right";

    var containerClass = this.options.classes.copyRightContainer;
    if (dir === C.RTL) {
      arrowClassName = this.options.classes.deletedCodeConnectorLink;
      arrowContent   = this.options.classes.deletedCodeConnectorLinkContent;
      containerClass = this.options.classes.copyLeftContainer;
      tooltip = "Copy to left";
    }

    var el = '<div class="' + arrowClassName + '" style="top:' + topOffset + 'px" title="' + tooltip + '" ' +
      'data-diff-index="' + diffIndex + '">' + arrowContent + '</div>';

    $('.' + containerClass).append(el);
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
   *   sourceStartLine:
   *   sourceEndLine:
   *   targetStartLine:
   *   targetNumRows:
   * }
   *
   * That's all the info we need to highlight the appropriate lines in the left + right editor, add the SVG
   * connectors, and include the appropriate <<, >> arrows.
   *
   * Note: to keep the returned object simple & to allow
   *
   * TODO refactor this function. It hurts my eyes.
   */
  AceDiff.prototype.computeDiff = function(diffType, offsetLeft, offsetRight, strLength) {

    // depending on whether content has been inserted or removed, we
    var targetEditor           = (diffType === C.DIFF_INSERT) ? this.editors.left : this.editors.right;
    var targetEditorCharOffset = (diffType === C.DIFF_INSERT) ? offsetLeft : offsetRight;

    // if INSERT, these refer to left editor; if DELETE, right
    var startLine,
        startChar,
        endLine,
        endChar,
        endCharNum = targetEditorCharOffset + strLength;

    var runningTotalChars = 0;
    targetEditor.lineLengths.forEach(function(lineLength, lineIndex) {
      runningTotalChars += lineLength;

      if (startLine === undefined && targetEditorCharOffset < runningTotalChars) {
        startLine = lineIndex; // 0-indexed, note
        startChar = targetEditorCharOffset - runningTotalChars + lineLength;
      }

      if (endLine === undefined && endCharNum <= runningTotalChars) {
        endLine = lineIndex;
        endChar = endCharNum - runningTotalChars + lineLength;
      }
    }, this);

    // if the start char is the final char on the line, it's a newline & we ignore it
    if (startChar > 0 && getCharsOnLine(targetEditor, startLine) === startChar) {
      startLine++;
      startChar = 0;
    }

    // if the end char is the first char on the line, we don't want to highlight that extra line
    if (endChar === 0) {
      endLine--;
    }

    var otherEditor, currentLineOtherEditor;

    if (diffType === C.DIFF_INSERT) {
      otherEditor = this.editors.right;
      currentLineOtherEditor = getLineForCharPosition(otherEditor, offsetRight);

      // but! if the offset position was at the very last char of the line, increase it by one
      if (isLastChar(otherEditor, offsetRight)) {
        currentLineOtherEditor++;
      }
    } else {
      var otherEditor = this.editors.left;
      currentLineOtherEditor = getLineForCharPosition(otherEditor, offsetLeft);

      // but! if the offset position was at the very last char of the line, increase it by one
      if (isLastChar(otherEditor, offsetLeft)) {
        currentLineOtherEditor++;
      }
    }


    // to determine if the highlightRightEndLine should be the same line (i.e. stuff is being
    // inserted + it'll show a single px line) or replacing the line, we just look at the start + end
    // char for the line
    var numRows = 0;

    var numCharsOnLine = getCharsOnLine(targetEditor, startLine);
    var numCharsOnLineOtherEditor = getCharsOnLine(otherEditor, currentLineOtherEditor);
    if (startLine === endLine && ( (startChar > 0 || endChar < numCharsOnLine) || (numCharsOnLineOtherEditor === 0)) ) {
      numRows++;
    }

    return {
      sourceStartLine: startLine,
      sourceEndLine: endLine,
      targetStartLine: currentLineOtherEditor,
      targetNumRows: numRows
    };
  };


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
      if (offsetChars <= runningTotal) {
        foundLine = i;
        break;
      }
    }
    return foundLine;
  }

  function isLastChar(editor, char) {
    var lines = editor.ace.getSession().doc.getAllLines(),
        runningTotal = 0,
        isLastChar = false;
    for (var i=0; i<lines.length; i++) {
      var lineLength = lines[i].length + 1; // +1 needed for newline char
      runningTotal += lineLength;
      if (char === runningTotal) {
        isLastChar = true;
        break;
      }
    }
    return isLastChar;
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
    return {
      rtl: groupDiffs(diffs.rtl),
      ltr: groupDiffs(diffs.ltr)
    };
  }

  function groupDiffs(diffs) {
    var groupedDiffs = [];
    diffs.forEach(function(diff, index) {
      if (index === 0) {
        groupedDiffs.push(diff);
        return;
      }
      var lastDiff = groupedDiffs[groupedDiffs.length-1];

      // compare the current line with the last (possibly grouped) item added to groupedDiffs
      if (diff.sourceStartLine === lastDiff.sourceEndLine+1 &&
        diff.targetStartLine === (lastDiff.targetStartLine + lastDiff.targetNumRows)) {
        groupedDiffs[groupedDiffs.length-1].sourceEndLine = diff.sourceEndLine;
        groupedDiffs[groupedDiffs.length-1].targetNumRows += diff.targetNumRows;
      } else {
        groupedDiffs.push(diff);
      }
    });

    return groupedDiffs;
  }

  // grouping diff lines can result in conflicts where one diff can be copied into the middle of another. This
  // removes them
  function dropConflictingDiffs(diffs) {
    var removeRightIndexes = [];
    diffs.ltr.forEach(function (leftDiff) {
      diffs.rtl.forEach(function (rightDiff, rightIndex) {
        if (rightDiff.targetStartLine > leftDiff.sourceStartLine &&
            rightDiff.targetStartLine < leftDiff.sourceEndLine) {
          removeRightIndexes.push(rightIndex);
        }
      });
    });
    removeRightIndexes.forEach(function(index) {
      diffs.rtl.splice(index, 1);
    });

    var removeLeftIndexes = [];
    diffs.rtl.forEach(function (rightDiff) {
      diffs.ltr.forEach(function (leftDiff, leftIndex) {
        if (leftDiff.targetStartLine > rightDiff.sourceStartLine &&
            leftDiff.targetStartLine < rightDiff.sourceEndLine) {
          removeLeftIndexes.push(leftIndex);
        }
      });
    });
    removeLeftIndexes.forEach(function(index) {
      diffs.rtl.splice(index, 1);
    });

    return diffs;
  }


  AceDiff.prototype.decorate = function(diffs) {
    clearGutter(this.options.classes.gutter);
    this.clearArrows();

    // clear our old diffs [nope... for efficiency, we'll need to do a compare TODO]
    this.editors.left.diffs = [];
    this.editors.right.diffs = [];

    diffs.ltr.forEach(function(info, diffIndex) {
      if (this.options.left.showDiffs) {
        var numRows = info.sourceEndLine - info.sourceStartLine + 1;
        this.showDiff(C.EDITOR_LEFT, info.sourceStartLine, numRows, this.options.classes.newCode);
        this.showDiff(C.EDITOR_RIGHT, info.targetStartLine, info.targetNumRows, this.options.classes.newCode);

        if (this.options.left.showLTRConnectors) {
          this.addConnector(C.LTR, info.sourceStartLine, info.sourceEndLine, info.targetStartLine, info.targetNumRows);
        }
        if (this.options.left.showCopyLTR) {
          this.addCopyArrows(C.LTR, info, diffIndex);
        }
      }
    }, this);

    diffs.rtl.forEach(function(info, diffIndex) {
      if (this.options.right.showDiffs) {
        this.showDiff(C.EDITOR_LEFT, info.targetStartLine, info.targetNumRows, this.options.classes.deletedCode);
        var numRows = info.sourceEndLine - info.sourceStartLine + 1;
        this.showDiff(C.EDITOR_RIGHT, info.sourceStartLine, numRows, this.options.classes.deletedCode);

        if (this.options.right.showRTLConnectors) {
          this.addConnector(C.RTL, info.sourceStartLine, info.sourceEndLine, info.targetStartLine, info.targetNumRows);
        }
        if (this.options.right.showCopyRTL) {
          this.addCopyArrows(C.RTL, info, diffIndex);
        }
      }
    }, this);
  };


  // taken from jQuery
  var extend = function() {
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
  };
  
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

//  function debounce(func, wait, immediate) {
//    var timeout;
//    return function() {
//      var context = this, args = arguments;
//      var later = function() {
//        timeout = null;
//        if (!immediate) func.apply(context, args);
//      };
//      var callNow = immediate && !timeout;
//      clearTimeout(timeout);
//      timeout = setTimeout(later, wait);
//      if (callNow) func.apply(context, args);
//    };
//  };
//  var myEfficientFn = debounce(function() { }, 250);

  return AceDiff;

}));
