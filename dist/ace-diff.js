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

    // meh.
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

    this.editors.left.lineLengths  = this.getLineLengths(this.editors.left);
    this.editors.right.lineLengths = this.getLineLengths(this.editors.right);

    // parse the raw diff into something a little more palatable
    var diffs = [];
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
        diffs.push(this.computeDiff(C.DIFF_DELETE, offset.left, offset.right, text));
        offset.right += text.length;

      } else if (chunkType === C.DIFF_INSERT) {
        diffs.push(this.computeDiff(C.DIFF_INSERT, offset.left, offset.right, text));
        offset.left += text.length;
      }
    }, this);

    // simplify our computed diffs; this groups together multiple diffs on subsequent lines
    this.diffs = simplifyDiffs(diffs);

    // removes diff conflicts from either side
    this.diffs = combineDiffs(this.diffs);

    // if we're dealing with too many diffs, fail silently
    if (this.diffs.length > this.options.maxDiffs) {
      return;
    }

    this.clearMarkers();
    this.decorate(this.diffs);
  };


  AceDiff.prototype.getNumDiffs = function () {
    return this.diffs.length;
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
      var p1_y = (leftStartLine * this.lineHeight) - leftScrollTop + 1;
      var p2_y = rightStartLine * this.lineHeight - rightScrollTop + 1;
      var p3_y = (leftEndLine * this.lineHeight) - leftScrollTop + 1;
      var p4_y = (rightEndLine * this.lineHeight) - rightScrollTop + 1;
      var curve1 = getCurve(p1_x, p1_y, p2_x, p2_y);
      var curve2 = getCurve(p4_x, p4_y, p3_x, p3_y);
      c = this.options.classes.connector;
    } else {
      var p1_y = (targetStartLine * this.lineHeight) - leftScrollTop + 1;
      var p2_y = sourceStartLine * this.lineHeight - rightScrollTop + 1;
      var p3_y = (targetStartLine * this.lineHeight) + (targetNumRows * this.lineHeight) - leftScrollTop + 1;
      var p4_y = (sourceEndLine * this.lineHeight) + this.lineHeight - rightScrollTop + 1;
      var curve1 = getCurve(p1_x, p1_y, p2_x, p2_y);
      var curve2 = getCurve(p4_x, p4_y, p3_x, p3_y);
      c = this.options.classes.connector;
    }

    var verticalLine1 = 'L' + p2_x + "," + p2_y + " " + p4_x + "," + p4_y;
    var verticalLine2 = 'L' + p3_x + "," + p3_y + " " + p1_x + "," + p1_y;
    var d = curve1 + ' ' + verticalLine1 + ' ' + curve2 + ' ' + verticalLine2;

    var gutterSVG = $("." + this.options.classes.gutter + " svg")[0];

    // need to
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
      var info = getSingleDiffInfo(this.editors.left, offsetLeft, diffText.length);
      var currentLineOtherEditor = getLineForCharPosition(this.editors.right, offsetRight);
      var numCharsOnLine = getCharsOnLine(this.editors.left, info.startLine);

      if (numCharsOnLine === 0 && newContentStartsWithNewline) {
        newContentStartsWithNewline = false;
      }
      if (isLastChar(this.editors.right, offsetRight, newContentStartsWithNewline)) {
        currentLineOtherEditor++;
      }
      var numCharsOnLineOtherEditor = getCharsOnLine(this.editors.right, currentLineOtherEditor);

      // whether or not this diff is a plain INSERT into the other editor, or overwrites a line take a little work to
      // figure out.
      var numRows = 0;
      if (numCharsOnLineOtherEditor > 0 && info.startLine === info.endLine && info.endChar < numCharsOnLine) {
        numRows++;
      }

      lineInfo = {
        leftStartLine: info.startLine,
        leftEndLine: info.endLine + 1,
        rightStartLine: currentLineOtherEditor,
        rightEndLine: currentLineOtherEditor + numRows
      };

    } else {
      var info = getSingleDiffInfo(this.editors.right, offsetRight, diffText.length);
      var currentLineOtherEditor = getLineForCharPosition(this.editors.left, offsetLeft);
      var numCharsOnLine = getCharsOnLine(this.editors.right, info.startLine);

      if (numCharsOnLine === 0 && newContentStartsWithNewline) {
        newContentStartsWithNewline = false;
      }
      if (isLastChar(this.editors.left, offsetLeft, newContentStartsWithNewline)) {
        currentLineOtherEditor++;
      }
      var numCharsOnLineOtherEditor = getCharsOnLine(this.editors.left, currentLineOtherEditor);


      var numRows = 0;
      if (numCharsOnLineOtherEditor > 0 && info.startLine === info.endLine && info.endChar < numCharsOnLine) {
        numRows++;
      }

      lineInfo = {
        leftStartLine: currentLineOtherEditor,
        leftEndLine: currentLineOtherEditor + numRows,
        rightStartLine: info.startLine,
        rightEndLine: info.endLine + 1
      };
    }

    return lineInfo;
  };


  // helper to return the startline, endline, startChar and endChar for a diff in a particular editor
  function getSingleDiffInfo(editor, offset, strLength) {
    var info = {
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 0
    };
    var endCharNum = offset + strLength;
    var runningTotal = 0;
    var startLineSet = false, endLineSet = false;

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
      var lastDiff = groupedDiffs[groupedDiffs.length-1];

      // TODO RTL
      if ((diff.leftStartLine - lastDiff.leftEndLine <= 1) &&
          (diff.rightStartLine - lastDiff.rightEndLine <= 1)) {
        groupedDiffs[groupedDiffs.length-1].leftEndLine = diff.leftEndLine;
        groupedDiffs[groupedDiffs.length-1].rightEndLine = diff.rightEndLine;
      } else {
        groupedDiffs.push(diff);
      }
    });

    // clear our any single line diffs (i.e. single line on both editors)
    var fullDiffs = [];
    groupedDiffs.forEach(function(diff) {
      if (diff.leftStartLine === diff.leftEndLine && diff.rightStartLine === diff.rightEndLine) {
        return;
      }
      fullDiffs.push(diff);
    });

    return fullDiffs;
  }


  /**
   * Our diff object contains diffs from either side: LTR and RTL. For all intensive purposes, every diff is
   * unidirectional spanning both editors; some just happen to be reduced to no lines on the other editor (i.e.
   * an insert or delete). This function eliminates diffs
   * @param diffs
   * @returns {*}
   */
  function combineDiffs(diffs) {

    // we DO know they're ordered from top of the editor to the bottom. How can that help us?

    var combined = [];
    diffs.forEach(function(diff, index) {
      if (index === 0) {
        combined.push(diff);
        return;
      }
      var lastDiff = combined[combined.length - 1];

    });

    return diffs;
  }


  AceDiff.prototype.decorate = function(diffs) {
    clearGutter(this.options.classes.gutter);
    this.clearArrows();

//    this.diffs = [];

    diffs.forEach(function(info, diffIndex) {
      if (this.options.showDiffs) {
        this.showDiff(C.EDITOR_LEFT, info.leftStartLine, info.leftEndLine, this.options.classes.diff);
        this.showDiff(C.EDITOR_RIGHT, info.rightStartLine, info.rightEndLine, this.options.classes.diff);

        if (this.options.showConnectors) {
          this.addConnector(C.LTR, info.leftStartLine, info.leftEndLine, info.rightStartLine, info.rightEndLine);
        }
        this.addCopyArrows(info, diffIndex);
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
