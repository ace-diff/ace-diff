/**
 * Very much in dev. Kind of a hodge podge of:
 * - jQuery/plain vanilla,
 * - whether the component handles creation & management of everything, or relies on dev providing some base markup
 *
 * I'll decide about those two in time.
 */

/*!
 * aceDiff
 * @author Ben Keen
 * @version 0.0.1
 * @date Feb 20 2015
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

  var Range = require('ace/range').Range;

  var DIFF_EQUAL = 0;
  var DIFF_DELETE = -1;
  var DIFF_INSERT = 1;


  // our constructor
  var AceDiff = function(element, options) {

    /*
    Lots to think about here. We either handle the whole thing: rendering both editors and the gutter and just
    rely on the user providing a little base CSS, or we do like now and rely on the user providing all the markup
    + CSS.

    Both approaches have advantages/disadvantages.
    */
    this.element = element;

    this.options = extend({
      diffFormat: "text", // text / fullLine
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

    // assumption: both editors have same line heights [maybe withdraw...]
    this.lineHeight = this.editors.left.ace.renderer.lineHeight;
    this.gutterHeight = $("#" + this.options.gutterID).height();
    this.gutterWidth = $("#" + this.options.gutterID).width();

    // set the modes
    this.editors.left.ace.getSession().setMode(this.options.editorLeft.mode);
    this.editors.right.ace.getSession().setMode(this.options.editorRight.mode);

    this.diff();
  };

  AceDiff.prototype.addEventHandlers = function () {
    var updateGap = this.updateGap.bind(this);
    this.editors.left.ace.getSession().on("changeScrollTop", updateGap);
    this.editors.right.ace.getSession().on("changeScrollTop", updateGap);
  };

  // exposed helpers. This allows on-the-fly changes to the ace-diff instance settings
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


  AceDiff.prototype.highlightDiff = function(editor, startLine, startChar, endLine, endChar, highlightClass) {
    var editor = this.editors[editor];
    editor.diffs.push(editor.ace.session.addMarker(new Range(startLine, startChar, endLine, endChar), highlightClass, this.options.diffFormat));
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

    //console.log(diff);

    var editor1OffsetChars = 0;
    var editor2OffsetChars = 0;
    this.editors.left.map = this.getDocMap(this.editors.left);
    this.editors.right.map = this.getDocMap(this.editors.right);


    this.createGutter();

    diff.forEach(function (chunk) {
      var op = chunk[0];
      var text = chunk[1];

      if (op === DIFF_EQUAL) {
        editor1OffsetChars += text.length;
        editor2OffsetChars += text.length;

        // things are in editor 2 that aren't in editor 1
      } else if (op === DIFF_DELETE) {
        var info = getRangeLineNumberAndCharPositions(this.editors.right, editor2OffsetChars, text.length);
        this.highlightDiff("right", info.startLineNum, info.startChar, info.endLineNum, info.endChar, "deletedCode");
        editor2OffsetChars += text.length;
        this.createCopyToLeftMarker(editor1OffsetChars, info.startLineNum, info.endLineNum);

        // show the line in editor 1, showing where the code will be inserted
        this.createTargetLine(this.editors.left, editor1OffsetChars, "diffInsertLeftTarget");

      } else if (op === DIFF_INSERT) {
        var info = getRangeLineNumberAndCharPositions(this.editors.left, editor1OffsetChars, text.length);
        this.highlightDiff("left", info.startLineNum, info.startChar, info.endLineNum, info.endChar, "newCode");
        editor1OffsetChars += text.length;

        this.createCopyToRightMarker(editor2OffsetChars, info.startLineNum, info.endLineNum);

        this.createTargetLine(this.editors.right, editor2OffsetChars, "diffInsertRightTarget");
      }
    }, this);
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

    var curve1 = getCurve(20, p1_x, p1_y, p2_x, p2_y);
    var curve2 = getCurve(20, p3_x, p3_y, p1_x, p1_y);


    var verticalLine = 'L' + p2_x + "," + p2_y + " " + p3_x + "," + p3_y;

    var path = '<path d="' + curve1 + " " + verticalLine + " " + curve2 + '" class="deletedCodeConnector" />';
    $("#" + this.options.gutterID + " svg").append(path);

    // good grief.
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

    var curve1 = getCurve(20, p1_x, p1_y, p2_x, p2_y);
    var curve2 = getCurve(20, p3_x, p3_y, p1_x, p1_y);
    var verticalLine = 'L' + p2_x + "," + p2_y + " " + p3_x + "," + p3_y;

    var path = '<path d="' + curve1 + " " + verticalLine + " " + curve2 + '" class="newCodeConnector" />';
    $("#" + this.options.gutterID + " svg").append(path);

    // good grief. Again.
    $("#" + this.options.gutterID).html($("#" + this.options.gutterID).html());
  };


  AceDiff.prototype.createTargetLine = function(editor, offsetChars, className) {
    var line = getLineForOffsetChars(editor, offsetChars);
    editor.diffs.push(editor.ace.session.addMarker(new Range(line, 0, line, 1), className, "fullLine"));
  };


  // ---------------------------------------------------------------


  // helper function to return the first & last line numbers, and the start & end char positions on each line
  function getRangeLineNumberAndCharPositions(editor, charNum, strLength) {
    var startLine, startChar, endLine, endChar;
    var endCharNum = charNum + strLength;

    // this looks darn fishy
    for (var i = 0; i < editor.map.length; i++) {
      if (startLine === undefined && charNum < editor.map[i]) {
        startLine = i;
        startChar = charNum - editor.map[i - 1];
      }
      if (endCharNum < editor.map[i]) {
        endLine = i;
        endChar = endCharNum - editor.map[i - 1];
        break;
      }
    }

    // if the start char is the final char on the line, it's a newline & we ignore it
    if (getCharsOnLine(editor, startLine) === startChar) {
      startLine++;
      startChar = 0;
    }

    // if the end char is the first char on the line
    if (endChar === 0) {
      endLine--;
      endChar = getCharsOnLine(editor, endLine);
    }

    return {
      startLineNum: startLine,
      startChar: startChar,
      endLineNum: endLine,
      endChar: endChar
    }
  }

  function getCharsOnLine(editor, line) {
    return editor.ace.getSession().doc.getLine(line).length;
  }

  function getLineForOffsetChars(editor, offsetChars) {
    var lines = editor.ace.getSession().doc.getAllLines();

    var foundLine = 0, runningTotal = 0;
    for (var i = 0; i < lines.length; i++) {
      var lineLength = lines[i].length + 1; // +1 needed for newline char
      runningTotal += lineLength;
      if (offsetChars < runningTotal) {
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

    // will need to accommodate scrolling, obviously
    var $el = $("#" + this.options.gutterID);

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


  // OMG this is awful
  function getCurve(curveFactor, startX, startY, endX, endY) {

    // midpoint
    var mpX = startX + ((endX - startX) / 2);
    var mpY = startY + ((endY - startY) / 2);

    var diffY = Math.abs(endY - startY);
    var diffX = Math.abs(endX - startX);

    // control point around which the bezier curves are computed
    var cpX = startX + ((endX - startX) / 4);
    var curveFlatline = startY + ((endY - startY) / 4);
    var cpY = curveFlatline - ((diffY / 100) * curveFactor);

    var curve = 'M' + startX + ',' + startY + ' Q' + cpX + ',' + cpY + ' ' + mpX + ',' + mpY + ' T' + endX + ',' + endY;

    return curve;
  }



  return AceDiff;
}));
