import AceDiff from '../../src/index';

const AceDiffInstance = new AceDiff({
  element: '.custom',
  left: {
    content: `{
  "name": "ace-diff",
  "version": "0.1.0",
  "date": "Mar 15, 2015",
  "description": "A diff/merging wrapper for Ace Editor built on google-diff-match-patch",
  "main": "dist/ace-diff.js",
  "scripts": {
    "test": "echo 'Error: no test specified' && exit 1"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/benkeen/ace-diff.git"
  },
  "keywords": [
    "ace",
    "dif",
    "diffing",
    "ace editor",
    "syntax highlighting"
  ],
  "author": "Ben Keen",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/benkeen/ace-diff/issues"
  },
  "homepage": "https://github.com/benkeen/ace-diff",
  "devDependencies": {
    "grunt": "^0.4.5",
    "grunt-contrib-uglify": "^0.8.0",
    "grunt-contrib-clean": "~0.5.0",
    "grunt-contrib-watch": "~0.5.3",
    "grunt-contrib-jshint": "^0.10.0"
  }
}`,
  },
  right: {
    content: `{
  "name": "ace-diff",
  "version": "0.1.1",
  "date": "Mar 21, 2015",
  "description": "A diff/merging wrapper for Ace Editor built on google-diff-match-patch",
  "main": "dist/ace-diff.js",
  "scripts": {
    "test": "echo 'Error: no test specified' && exit 1"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/benkeen/ace-diff.git"
  },
  "keywords": [
    "ace",
    "dif",
    "diffing",
    "merge",
    "merging",
    "ace editor",
    "syntax highlighting"
  ],
  "author": "Ben Keen",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/benkeen/ace-diff/issues"
  },
  "homepage": "https://github.com/benkeen/ace-diff",
  "devDependencies": {
    "grunt": "^0.4.5",
    "grunt-contrib-uglify": "^0.8.0",
    "grunt-contrib-clean": "~0.5.0",
    "grunt-contrib-watch": "~0.5.3",
    "grunt-contrib-jshint": "^0.10.0"
  }
}`,
  },
});


const aceA = ace.edit(document.querySelector('.ace-a'))
const aceB = ace.edit(document.querySelector('.ace-b'))

const sessA = ace.createEditSession('some A content')
const sessB = ace.createEditSession('some B content')
aceA.setSession(sessA)
aceB.setSession(sessB)


const acediff2 = new AceDiff({
  element: '.split',
  left: {
    ace: aceA,
  },
  right: {
    ace: aceB
  }
})
debugger
console.log(acediff2)