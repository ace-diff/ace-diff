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
  "use strict";

  var Range = require("ace/range").Range;

  // constants from match-patch-diff
  var DIFF_EQUAL  = 0;
  var DIFF_DELETE = -1;
  var DIFF_INSERT = 1;
  var EDITOR_RIGHT = "right"; // todo
  var EDITOR_LEFT  = "left";


  // our constructor
  var AceDiff = function(element, options) {
    this.element = element;

    this.options = extend({
      diffFormat: "text", // text / fullLine [to be removed: for debugging only!]
      gutterID: "",
      editorLeft: {
        id: "editor1",
        mode: "ace/mode/javascript",
        editable: true
      },
      editorRight: {
        id: "editor2",
        mode: "ace/mode/javascript",
        editable: false
      }
    }, options);


    // instantiate the editors in an internal data structure that'll store a little info about the diffs and
    // editor content
    this.editors = {
      left: {
        ace: ace.edit(this.options.editorLeft.id),
        map: [],
        diffs: []
      },
      right: {
        ace: ace.edit(this.options.editorRight.id),
        map: [],
        diffs: []
      }
    };

    this.addEventHandlers();

    this.lineHeight = this.editors.left.ace.renderer.lineHeight; // assumption: both editors have same line heights
    var $gutter = $("#" + this.options.gutterID);
    this.gutterHeight = $gutter.height();
    this.gutterWidth = $gutter.width();

    // set the editor modes
    this.editors.left.ace.getSession().setMode(this.options.editorLeft.mode);
    this.editors.right.ace.getSession().setMode(this.options.editorRight.mode);

    this.diff();
  };


  AceDiff.prototype.addEventHandlers = function () {
    var updateGap = this.updateGap.bind(this);
    this.editors.left.ace.getSession().on("changeScrollTop", updateGap);
    this.editors.right.ace.getSession().on("changeScrollTop", updateGap);
  };


  // allows on-the-fly changes to the AceDiff instance settings
  AceDiff.prototype.setOptions = function (options) {
    this.options = extend(this.options, options);
  };


  AceDiff.prototype.unhighlightDiffs = function() {
    for (var i = 0; i < this.editors.left.diffs.length; i++) {
      this.editors.left.ace.getSession().removeMarker(this.editors.left.diffs[i]);
    }
    for (var i = 0; i < this.editors.right.diffs.length; i++) {
      this.editors.right.ace.getSession().removeMarker(this.editors.right.diffs[i]);
    }
  };


  AceDiff.prototype.getDocMap = function(editor) {
    var lines = editor.ace.getSession().doc.getAllLines();
    var map = [];

    var runningTotal = 0;
    for (var i = 0; i < lines.length; i++) {
      runningTotal += lines[i].length + 1; // +1 needed for newline char
      map[i] = runningTotal;
    }
    return map;
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

    console.log("showing diff: ", startLine, numRows);

    var endLine = (startLine + numRows) - 1;

    var classNames = className;
    if (numRows === 0) {
      classNames += " lineOnly";
    } else {
      classNames += " range";
    }
        // the start/end chars don't matter. We always highlight the full row. So we just sent them to 0 and 1
    editor.diffs.push(editor.ace.session.addMarker(new Range(startLine, 0, endLine, 1), classNames, this.options.diffFormat));
  };


  // our main diffing function
  AceDiff.prototype.diff = function() {
    this.unhighlightDiffs();

    // start by doing our actual diffs
    var dmp = new diff_match_patch();
    var val1 = this.editors.left.ace.getSession().getValue();
    var val2 = this.editors.right.ace.getSession().getValue();
    var diff = dmp.diff_main(val2, val1);
    dmp.diff_cleanupSemantic(diff);

//    console.log(diff);

    this.editors.left.map = this.getDocMap(this.editors.left);
    this.editors.right.map = this.getDocMap(this.editors.right);

    // parse the raw diff into something a little more palatable
    var diffs = { rtl: [], ltr: [] };
    var offset = {
      left: 0,
      right: 0
    };

    diff.forEach(function (chunk) {
      var op   = chunk[0];
      var text = chunk[1];

      if (op === DIFF_EQUAL) {
        offset.left += text.length;
        offset.right += text.length;
      } else if (op === DIFF_DELETE) {
        offset.right += text.length;
        diffs.rtl.push(this.computeDiff(DIFF_DELETE, offset.left, offset.right, text.length));
      } else if (op === DIFF_INSERT) {
        offset.left += text.length;
        diffs.ltr.push(this.computeDiff(DIFF_INSERT, offset.left, offset.right, text.length));
      }
    }, this);

    // simplify the
    diffs = simplifyDiffs(diffs);

    this.decorate(diffs);
  };


  // called onscroll. Updates the gap to ensure the connectors are all lining up
  AceDiff.prototype.updateGap = function () {
    this.diff();
  };


  // this one's for stuff that's been REMOVED in the left editor
  AceDiff.prototype.createCopyToLeftMarker = function(editor1OffsetChars, rightStartLine, rightEndLine) {
    var line = getLineForOffsetChars(this.editors.left, editor1OffsetChars);

    var leftScrollTop = this.editors.left.ace.getSession().getScrollTop();
    var rightScrollTop = this.editors.right.ace.getSession().getScrollTop();

    var p1_x = 0;
    var p1_y = (line * this.lineHeight) - leftScrollTop;

    var p2_x = this.gutterWidth + 1;
    var p2_y = rightStartLine * this.lineHeight - rightScrollTop;
    var p3_x = this.gutterWidth + 1;
    var p3_y = (rightEndLine * this.lineHeight) + this.lineHeight  - rightScrollTop;

    var curve1 = getCurve(p1_x, p1_y, p2_x, p2_y);
    var curve2 = getCurve(p3_x, p3_y, p1_x, p1_y);

    var verticalLine = 'L' + p2_x + "," + p2_y + " " + p3_x + "," + p3_y;

    var path = '<path d="' + curve1 + " " + verticalLine + " " + curve2 + '" class="deletedCodeConnector" />';
    $("#" + this.options.gutterID + " svg").append(path);
    $("#" + this.options.gutterID).html($("#" + this.options.gutterID).html());
  };


  // to be combined with previous, when I start to de-suck the code
  AceDiff.prototype.createCopyToRightMarker = function(editor2OffsetChars, leftStartLine, leftEndLine) {
    var line = getLineForOffsetChars(this.editors.right, editor2OffsetChars);
    var leftScrollTop = this.editors.left.ace.getSession().getScrollTop();
    var rightScrollTop = this.editors.right.ace.getSession().getScrollTop();

    // top right
    var p1_x = this.gutterWidth + 1;
    var p1_y = (line * this.lineHeight) - rightScrollTop;

    var p2_x = -1;
    var p2_y = leftStartLine * this.lineHeight - leftScrollTop;
    var p3_x = -1;
    var p3_y = (leftEndLine * this.lineHeight) + this.lineHeight  - leftScrollTop;

    var curve1 = getCurve(p1_x, p1_y, p2_x, p2_y);
    var curve2 = getCurve(p3_x, p3_y, p1_x, p1_y);
    var verticalLine = 'L' + p2_x + "," + p2_y + " " + p3_x + "," + p3_y;

    var path = '<path d="' + curve1 + " " + verticalLine + " " + curve2 + '" class="newCodeConnector" />';
    $("#" + this.options.gutterID + " svg").append(path);
    $("#" + this.options.gutterID).html($("#" + this.options.gutterID).html());
  };


  AceDiff.prototype.createTargetLine = function(editor, info, className) {
    var startLine = getLineForOffsetChars(editor, info.otherEditorOffsetChars);
    var endLine = startLine;
    var classNames = className;

    var multiline = false;
    if (info.startLine === info.endLine) {
      if (info.startChar !== 0 && getCharsOnLine(editor, startLine) !== info.endChar) {
        multiline = true;
      }
    }

    if (!multiline) {
      classNames += " lineOnly";
    } else {
      classNames += " range";
    }

    editor.diffs.push(editor.ace.session.addMarker(new Range(startLine, 0, endLine, 1), classNames, "fullLine"));
  };

  AceDiff.prototype.addCopyArrows = function () {

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
    var targetEditor       = (diffType === DIFF_INSERT) ? this.editors.left : this.editors.right;
    var targetEditorOffset = (diffType === DIFF_INSERT) ? offsetLeft : offsetRight;

    // if INSERT, these refer to left editor; if DELETE, right
    var startLine,
        startChar,
        endLine,
        endChar,
        endCharNum = targetEditorOffset + strLength;

    for (var i=0; i<targetEditor.map.length; i++) {
      if (startLine === undefined && targetEditorOffset < targetEditor.map[i]) {
        startLine = i - 1; // 0-indexed, note
        startChar = targetEditorOffset - targetEditor.map[i-1];
      }

      if (endCharNum < targetEditor.map[i]) {
        endLine = i-1;
        endChar = endCharNum - targetEditor.map[i-1];
        break;
      }
    }

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
    if (diffType === DIFF_INSERT) {
      var currentLineRightEditor = getLineForOffsetChars(this.editors.right, offsetRight);

      // to determine if the highlightRightEndLine should be the same line (i.e. stuff is being
      // inserted + it'll show a single px line) or replacing the line, we just look at the start + end
      // char for the line

      var numRows = 0;

      // scenario 1: only one line being inserted, and the line already contained content
      if (startLine === endLine && (startChar > 0 || endChar < getCharsOnLine(targetEditor, startLine))) {
        //console.log(startLine, endLine, startChar, endChar, getCharsOnLine(targetEditor, startLine));
        numRows++;
      }

      // scenario 2:

      data = {
        sourceStartLine: startLine,
        sourceEndLine: endLine,
        targetStartLine: currentLineRightEditor,
        targetNumRows: numRows
      }
    } else {

      data = {
//        leftStartLine: startLine,
//        leftEndLine: endLine
        rightStartLine: startLine,
        rightEndLine: endLine
      }
    }

    return data;
  };


  // note that this and everything else in this script uses 0-indexed row numbers
  function getCharsOnLine(editor, line) {
    return editor.ace.getSession().doc.getLine(line).length;
  }


  function getLineForOffsetChars(editor, offsetChars) {
    var lines = editor.ace.getSession().doc.getAllLines();

    var foundLine = 0, runningTotal = 0;
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

  AceDiff.prototype.createGutter = function() {
    clearGutter(this.options.gutterID);

    var leftHeight = this.editors.left.ace.getSession().getLength() * this.lineHeight;
    var rightHeight = this.editors.right.ace.getSession().getLength() * this.lineHeight;

    var height = Math.max(leftHeight, rightHeight, this.gutterHeight);

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', this.gutterWidth);
    svg.setAttribute('height', height);
    svg.setAttribute('style', 'background-color: #efefef');
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

    document.getElementById(this.options.gutterID).appendChild(svg);
  }

  function clearGutter(id) {
    $("#" + id + " svg").remove();
  }

  /*
   * The purpose of this step is to combine multiple rows where, say, line 1 => line 1, line 2 => line 2,
   * line 3-4 => line 3. That could be reduced to a single connector line 1=4 => line 1-3
   */
  function simplifyDiffs(diffs) {
//    for (var i=1; i<leftToRight; i++) {
//      if (leftToRight[i]
//        }

    // first pass
    diffs.ltr.forEach(function () {

    }, this);



    return diffs;
  }


  AceDiff.prototype.decorate = function(diffs) {
    this.createGutter();

    diffs.ltr.forEach(function(info) {

      console.log(info);

      var numRows = info.sourceEndLine - info.sourceStartLine + 1;
      this.showDiff("left", info.sourceStartLine, numRows, "newCode");

      this.showDiff("right", info.targetStartLine, info.targetNumRows, "newCode");

//      this.createCopyToRightMarker(info.otherEditorOffsetChars, info.startLine, info.endLine);
//      this.createTargetLine(this.editors.right, info, "diffInsertRightTarget");
//      this.addCopyArrows();
    }, this);
  };


  // ------------------------------------------------ helpers ------------------------------------------------

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

  return AceDiff;
}));
