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
  var AceDiff = function(element, settings) {
    this.element = element; // TODO

    this.settings = extend({
      diffFormat: "text", // text / fullLine
      editorLeft: {
        id: "editor1",
        mode: "ace/mode/javascript"
      },
      editorRight: {
        id: "editor2",
        mode: "ace/mode/javascript"
      }
    }, settings);

    // instantiate the editors in an internal data structure that'll store a little info about the diffs and
    // editor content
    this.editors = {
      left: {
        ace: ace.edit(this.settings.editorLeft.id),
        map: [],
        diffs: []
      },
      right: {
        ace: ace.edit(this.settings.editorRight.id),
        map: [],
        diffs: []
      }
    };

    // set the modes
    this.editors.left.ace.getSession().setMode(this.settings.editorLeft.mode);
    this.editors.right.ace.getSession().setMode(this.settings.editorRight.mode);

    this.diff();
  };


  // exposed helpers. This allows on-the-fly changes to the ace-diff instance settings
  AceDiff.prototype.updateSettings = function (options) {
    this.options = extend(this.options, options);
  };

  AceDiff.prototype.unhighlightDiffs = function() {
    for (var i = 0; i < this.editors.left.diffs.length; i++) {
      this.editors.left.ace.getSession().removeMarker(this.editors.left.diffs[i]);
    }
    for (var i = 0; i < this.editors.right.diffs.length; i++) {
      this.editors.right.ace.getSession().removeMarker(this.editors.right.diffs[i]);
    }
  }


  AceDiff.prototype.getDocMap = function(editor) {
    var lines = editor.ace.getSession().doc.getAllLines();
    var map = [];

    var runningTotal = 0;
    for (var i = 0; i < lines.length; i++) {
      var lineLength = lines[i].length + 1; // +1 needed for newline char
      runningTotal += lineLength;
      map[i] = runningTotal;
    }
    return map;
  };

  AceDiff.prototype.highlightDiff = function(editor, startLine, startChar, endLine, endChar, highlightClass) {
    var editor = this.editors[editor];
    editor.diffs.push(editor.ace.session.addMarker(new Range(startLine, startChar, endLine, endChar), highlightClass, this.settings.diffFormat));
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

    console.log(diff);

    var editor1OffsetChars = 0;
    var editor2OffsetChars = 0;
    this.editors.left.map = this.getDocMap(this.editors.left);
    this.editors.right.map = this.getDocMap(this.editors.right);

    createGutter();


    diff.forEach(function (chunk) {
      var op = chunk[0];
      var text = chunk[1];

      if (op === DIFF_EQUAL) {
        editor1OffsetChars += text.length;
        editor2OffsetChars += text.length;

        // things are in editor 2 that aren't in editor 1
      } else if (op === DIFF_DELETE) {
        var info = getRangeLineNumberAndCharPositions(this.editors.right.map, editor2OffsetChars, text.length);
        this.highlightDiff("right", info.startLineNum, info.startChar, info.endLineNum, info.endChar, "deletedCode");
        editor2OffsetChars += text.length;

      } else if (op === DIFF_INSERT) {
        var info = getRangeLineNumberAndCharPositions(this.editors.left.map, editor1OffsetChars, text.length);
        this.highlightDiff("left", info.startLineNum, info.startChar, info.endLineNum, info.endChar, "newCode");
        editor1OffsetChars += text.length;
      }
    }, this);


    // helper function to return the first & last line numbers, and the start and end char positions for those lines
    function getRangeLineNumberAndCharPositions(docMap, charNum, strLength) {
      var startLine, startChar, endLine, endChar;
      var endCharNum = charNum + strLength;

      for (var i = 0; i < docMap.length; i++) {
        if (!startLine && charNum < docMap[i]) {
          startLine = i;
          startChar = charNum - docMap[i - 1];
        }
        if (endCharNum < docMap[i]) {
          endLine = i;
          endChar = endCharNum - docMap[i - 1];
          break;
        }
      }

      return {
        startLineNum: startLine,
        startChar: startChar,
        endLineNum: endLine,
        endChar: endChar
      }
    }

    function createGutter() {
      clearGutter();
      console.log($("#diffGutter").height());
      console.log($("#diffGutter").height());
    }

    function clearGutter() {
      $("#diffGutter svg").remove();
    }

  }



  /*
   svg paths + fill:
   http://www.w3schools.com/svg/tryit.asp?filename=trysvg_path2
   */

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
  
  return AceDiff;
}));
