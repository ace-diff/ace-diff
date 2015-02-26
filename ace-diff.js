/*!
 * ace-diff
 * @author Ben Keen
 * @version 0.0.1
 * @date Feb 24 2015
 * @repo http://github.com/benkeen/ace-diff
 */

// UMD pattern from https://github.com/umdjs/umd/blob/master/returnExports.js
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but only CommonJS-like environments that support module.exports,
    // like Node
    module.exports = factory(require());
  } else {
    // browser globals (root is window)
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
    LTR: 'ltr'
  };

  // our constructor
  var AceDiff = function(options) {

    this.options = $.extend(true, {

      // if an element is passed, AceDiff does the work of creating the whole markup for you: editors, gutter, etc.
      // otherwise, you need to do it yourself. See the doc.
      element: null,
      mode: null,
      lockScrolling: true,
      editorLeft: {
        id: 'acediff-left-editor',
        content: null,
        mode: null,
        editable: true
      },
      editorRight: {
        id: 'acediff-right-editor',
        content: null,
        mode: null,
        editable: true
      },

      // all classes are overridable
      classes: {
        gutter: 'acediff-gutter',
        newCode: 'acediff-new-code',
        newCodeConnector: 'acediff-new-code-connector',
        newCodeConnectorLink: 'acediff-new-code-connector-copy',
        newCodeConnectorLinkContent: '&raquo;',
        deletedCode: 'acediff-deleted-code',
        deletedCodeConnector: 'acediff-deleted-code-connector',
        deletedCodeConnectorLink: 'acediff-deleted-code-connector-copy',
        deletedCodeConnectorLinkContent: '&laquo;',
        copyRightContainer: 'acediff-copy-right',
        copyLeftContainer: 'acediff-copy-left'
      }
    }, options);

    // instantiate the editors in an internal data structure that'll store a little info about the diffs and
    // editor content
    this.editors = {
      left: {
        ace: ace.edit(this.options.editorLeft.id),
        markers: [],
        lineLengths: []
      },
      right: {
        ace: ace.edit(this.options.editorRight.id),
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
    this.editors.left.ace.setReadOnly(!this.options.editorLeft.editable);
    this.editors.right.ace.setReadOnly(!this.options.editorRight.editable);

    this.createCopyContainers();
    this.createGutter();

    this.diff();
  };


  AceDiff.prototype.addEventHandlers = function () {
    var updateGap = this.updateGap.bind(this);
    this.editors.left.ace.getSession().on("changeScrollTop", function(scroll) {
      updateGap('left', scroll);
    });
    this.editors.right.ace.getSession().on("changeScrollTop", function(scroll) {
      updateGap('right', scroll);
    });

    var diff = this.diff.bind(this);
    this.editors.left.ace.on("change", diff);
    this.editors.right.ace.on("change", diff);

    // event delegated click handlers for the copy-to-right/left buttons
    var callback = function(e) {

      // this contains the char index where the
      var diffIndex = parseInt(e.target.getAttribute('data-diff-index'), 10);
      var charIndex = parseInt(e.target.getAttribute('data-char-index'), 10);
      var rightEditorContent = this.editors.right.ace.getSession().getValue();
      var contentToInsert = this.rawDiff[diffIndex][1];
      var newContent = rightEditorContent.substr(0, charIndex) + contentToInsert + rightEditorContent.substr(charIndex);

      // keep track of the scroll height
      var h = this.editors.right.ace.getSession().getScrollTop();
      this.editors.right.ace.getSession().setValue(newContent);
      this.editors.right.ace.getSession().setScrollTop(parseInt(h));

      this.diff();

    }.bind(this);

    on('.' + this.options.classes.gutter, 'click', '.' + this.options.classes.newCodeConnectorLink, callback);


    // TODOoooo
    var callback2 = function(e) {

      // this contains the char index where the
      var diffIndex = parseInt(e.target.getAttribute('data-diff-index'), 10);
      var charIndex = parseInt(e.target.getAttribute('data-char-index'), 10);

      var leftEditorContent = this.editors.left.ace.getSession().getValue();
      var contentToInsert = this.rawDiff[diffIndex][1];
      var newContent = leftEditorContent.substr(0, charIndex) + contentToInsert + leftEditorContent.substr(charIndex);

      // keep track of the scroll height
      var h = this.editors.left.ace.getSession().getScrollTop();
      this.editors.left.ace.getSession().setValue(newContent);
      this.editors.left.ace.getSession().setScrollTop(parseInt(h));

      this.diff();

    }.bind(this);

    on('.' + this.options.classes.gutter, 'click', '.' + this.options.classes.deletedCodeConnectorLink, callback2);
    
  };


  // allows on-the-fly changes to the AceDiff instance settings
  AceDiff.prototype.setOptions = function (options) {
    this.options = $.extend(true, this.options, options);
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
    if (editor === C.EDITOR_LEFT && this.options.editorLeft.mode !== null) {
      mode = this.options.editorLeft.mode;
    }
    if (editor === C.EDITOR_RIGHT && this.options.editorRight.mode !== null) {
      mode = this.options.editorRight.mode;
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
    editor.markers.push(editor.ace.session.addMarker(new Range(startLine, 0, endLine, 1), classNames, "fullLine"));
  };


  // our main diffing function
  AceDiff.prototype.diff = function() {

    // start by doing our actual diffs
    var dmp = new diff_match_patch();
    var val1 = this.editors.left.ace.getSession().getValue();
    var val2 = this.editors.right.ace.getSession().getValue();
    var diff = dmp.diff_main(val2, val1);
    dmp.diff_cleanupSemantic(diff);

    this.rawDiff = diff;

    this.editors.left.lineLengths  = this.getLineLengths(this.editors.left);
    this.editors.right.lineLengths = this.getLineLengths(this.editors.right);

    // parse the raw diff into something a little more palatable
    var diffs = { rtl: [], ltr: [] };
    var offset = {
      left: 0,
      right: 0
    };

    diff.forEach(function (chunk, index) {
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
        var diffInfo = this.computeDiff(C.DIFF_DELETE, offset.left, offset.right, text.length);

        // this kind of sucks. Maybe put charIndex into new rawDiff?
        diffInfo.diffIndex = index;
        diffInfo.charIndex = offset.left;

        diffs.rtl.push(diffInfo);
        offset.right += text.length;
      } else if (chunkType === C.DIFF_INSERT) {
        var diffInfo = this.computeDiff(C.DIFF_INSERT, offset.left, offset.right, text.length)
        diffInfo.diffIndex = index;
        diffInfo.charIndex = offset.right;

        diffs.ltr.push(diffInfo);
        offset.left += text.length;
      }
    }, this);

    // simplify our computed diffs (i.e. this groups together multiple diffs, if possible)
    diffs = simplifyDiffs(diffs);

    this.clearMarkers();
    this.decorate(diffs);
  };


  // called onscroll. Updates the gap to ensure the connectors are all lining up
  AceDiff.prototype.updateGap = function(editor, scroll) {

    // needs to take into account the diffs
    /*
    if (this.options.lockScrolling) {
      if (editor === 'left') {
        this.editors.right.ace.getSession().setScrollTop(parseInt(scroll) || 0);
      }
      if (editor === 'right') {
        this.editors.left.ace.getSession().setScrollTop(parseInt(scroll) || 0);
      }
    }
    */

    // Naaahhh! This just needs to update the contents of the gap, not re-run diffs TODO
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

    /*
    This is what the vars refer to:
      p1   p2

      p3   p4
    All connectors, regardless of ltr or rtl have the same point system, even if p1 === p3 or p2 === p4
    */

    // TODO

    if (dir === 'ltr') {

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
      var path = '<path d="' + curve1 + ' ' + verticalLine1 + ' ' + curve2 + ' ' + verticalLine2 + '" ' +
          'class="' + this.options.classes.newCodeConnector + '" />';

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
      var path = '<path d="' + curve1 + ' ' + verticalLine1 + ' ' + curve2 + ' ' + verticalLine2 + '" ' +
          'class="' + this.options.classes.deletedCodeConnector + '" />';
    }

    /// urrrrrrrghhhhh TODO
    var $gutterSVG = $("." + this.options.classes.gutter + " svg");
    $gutterSVG.append(path);
    $gutterSVG.html($gutterSVG.html());
  };


  AceDiff.prototype.addCopyArrows = function(dir, info) {
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
      'data-char-index="' + info.charIndex + '" data-diff-index="' + info.diffIndex + '">' + arrowContent + '</div>';
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

    var data = {};
    if (diffType === C.DIFF_INSERT) {
      var currentLineRightEditor = getLineForCharPosition(this.editors.right, offsetRight);

      // but! if the offset position was at the very last char of the line, increase it by one
      if (isLastChar(this.editors.right, offsetRight)) { // TODO bug here for completely new lines
        currentLineRightEditor++;
      }

      // to determine if the highlightRightEndLine should be the same line (i.e. stuff is being
      // inserted + it'll show a single px line) or replacing the line, we just look at the start + end
      // char for the line
      var numRows = 0;

      // only one line being inserted, and the line already contained content
      if (startLine === endLine && (startChar > 0 || endChar < getCharsOnLine(targetEditor, startLine))) {
        numRows++;
      }

      data = {
        sourceStartLine: startLine,
        sourceEndLine: endLine,
        targetStartLine: currentLineRightEditor,
        targetNumRows: numRows
      }

    } else {
      var currentLineLeftEditor = getLineForCharPosition(this.editors.left, offsetLeft);

      // but! if the offset position was at the very last char of the line, increase it by one
      if (isLastChar(this.editors.left, offsetLeft)) { // TODO bug here for completely new lines
        currentLineLeftEditor++;
      }

      // to determine if the highlightRightEndLine should be the same line (i.e. stuff is being
      // inserted + it'll show a single px line) or replacing the line, we just look at the start + end
      // char for the line

      var numRows = 0;

      // only one line being inserted, and the line already contained content
      if (startLine === endLine && (startChar > 0 || endChar < getCharsOnLine(targetEditor, startLine))) {
        numRows++;
      }

      data = {
        sourceStartLine: startLine,
        sourceEndLine: endLine,
        targetStartLine: currentLineLeftEditor,
        targetNumRows: numRows
      }
    }

    return data;
  };


  // note that this and everything else in this script uses 0-indexed row numbers
  function getCharsOnLine(editor, line) {
    return editor.ace.getSession().doc.getLine(line).length;
  }


  function getLineForCharPosition(editor, offsetChars) {
    var lines = editor.ace.getSession().doc.getAllLines();

    var foundLine = 0,
        runningTotal = 0;

    for (var i = 0; i < lines.length; i++) {
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
    var lines = editor.ace.getSession().doc.getAllLines();

    var runningTotal = 0,
        isLastChar = false;
    for (var i = 0; i < lines.length; i++) {
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

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', this.gutterWidth);
    svg.setAttribute('height', height);
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

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
   * The purpose of this step is to combine multiple rows where, say, line 1 => line 1, line 2 => line 2,
   * line 3-4 => line 3. That could be reduced to a single connector line 1=4 => line 1-3
   */
  function simplifyDiffs(diffs) {
    return diffs;
  }


  AceDiff.prototype.decorate = function(diffs) {
    clearGutter(this.options.classes.gutter);
    this.clearArrows();

    // clear our old diffs [nope... for efficiency, we'll need to do a compare TODO]
    this.editors.left.diffs = [];
    this.editors.right.diffs = [];

    diffs.ltr.forEach(function(info) {
      var numRows = info.sourceEndLine - info.sourceStartLine + 1;
      this.showDiff(C.EDITOR_LEFT, info.sourceStartLine, numRows, this.options.classes.newCode);
      this.showDiff(C.EDITOR_RIGHT, info.targetStartLine, info.targetNumRows, this.options.classes.newCode);
      this.addConnector(C.LTR, info.sourceStartLine, info.sourceEndLine, info.targetStartLine, info.targetNumRows);

      if (this.options.editorRight.editable) {
        this.addCopyArrows(C.LTR, info);
      }
    }, this);

    diffs.rtl.forEach(function(info) {
      this.showDiff(C.EDITOR_LEFT, info.targetStartLine, info.targetNumRows, this.options.classes.deletedCode);

      var numRows = info.sourceEndLine - info.sourceStartLine + 1;
      this.showDiff(C.EDITOR_RIGHT, info.sourceStartLine, numRows, this.options.classes.deletedCode);
      this.addConnector(C.RTL, info.sourceStartLine, info.sourceEndLine, info.targetStartLine, info.targetNumRows);

      if (this.options.editorRight.editable) {
        this.addCopyArrows(C.RTL, info);
      }
    }, this);
  };


  // ------------------------------------------------ helpers ------------------------------------------------

  // taken from jQuery
  // crap. doesn't seem to do deep extend.
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


  return AceDiff;

}));
