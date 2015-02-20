// all temporary, of course




var editors = {
  left:  {
    ace: ace.edit("editor1"),
    map: [],
    diffs: []
  },
  right: {
    ace: ace.edit("editor2"),
    map: [],
    diffs: []
  }
};

editors.left.ace.getSession().setMode("ace/mode/javascript");
editors.right.ace.getSession().setMode("ace/mode/javascript");

var Range = require('ace/range').Range;

var DIFF_EQUAL = 0;
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;


function diff() {
  unhighlightDiffs();

  var dmp = new diff_match_patch();
  var diff = dmp.diff_main(editors.right.ace.getSession().getValue(), editors.left.ace.getSession().getValue());
  dmp.diff_cleanupSemantic(diff);

  var editor1OffsetChars = 0;
  var editor2OffsetChars = 0;
  editors.left.map = getDocMap(editors.left);
  editors.right.map = getDocMap(editors.right);

  diff.forEach(function(chunk) {
    var op = chunk[0];
    var text = chunk[1];

    if (op === DIFF_EQUAL) {
      editor1OffsetChars += text.length;
      editor2OffsetChars += text.length;

      // things are in editor 2 that aren't in editor 1
    } else if (op === DIFF_DELETE) {
      var info = getRangeLineNumberAndCharPositions(editors.right.map, editor2OffsetChars, text.length);
      highlightDiff("right", info.startLineNum, info.startChar, info.endLineNum, info.endChar, "deletedCode");
      editor2OffsetChars += text.length;

    } else if (op === DIFF_INSERT) {
      var info = getRangeLineNumberAndCharPositions(editors.left.map, editor1OffsetChars, text.length);
      highlightDiff("left", info.startLineNum, info.startChar, info.endLineNum, info.endChar, "newCode");
      editor1OffsetChars += text.length;
    }
  });
}

var diffs = [];
function highlightDiff(editor, startLine, startChar, endLine, endChar, highlightClass) {
  var editor = editors[editor];
  editor.diffs.push(editor.ace.session.addMarker(new Range(startLine, startChar, endLine, endChar), highlightClass, "text")); // fullLine
}

function unhighlightDiffs() {
  for (var i=0; i<editors.left.diffs.length; i++) {
    editors.left.ace.getSession().removeMarker(editors.left.diffs[i]);
  }
  for (var i=0; i<editors.right.diffs.length; i++) {
    editors.right.ace.getSession().removeMarker(editors.right.diffs[i]);
  }
}


function getDocMap(editor) {
  var lines = editor.ace.getSession().doc.getAllLines();
  var map = [];

  var runningTotal = 0;
  for (var i=0; i<lines.length; i++) {
    var lineLength = lines[i].length + 1; // +1 needed for newline char
    runningTotal += lineLength;
    map[i] = runningTotal;
  }
  return map;
}


// helper function to return the first & last line numbers, and the start and end char positions for those lines
function getRangeLineNumberAndCharPositions(docMap, charNum, strLength) {
  var startLine, startChar, endLine, endChar;
  var endCharNum = charNum + strLength;

  for (var i=0; i<docMap.length; i++) {
    if (!startLine && charNum < docMap[i]) {
      startLine = i;
      startChar = charNum - docMap[i-1];
    }
    if (endCharNum < docMap[i]) {
      endLine = i;
      endChar = endCharNum - docMap[i-1];
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



$(function () {
  $("#autoDiff").on("click", function (e) {
    if (e.target.checked) {
      editors.left.ace.on("change", diff);
      editors.right.ace.on("change", diff);
      diff();
    } else {
      editors.left.ace.off("change", diff);
      editors.right.ace.off("change", diff);
    }
  });

  $("[name=diffVisFormat]").on("change", function (e) {
    console.log(e.target.value);
  });
});
