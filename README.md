## Ace-diff

*** Currently under dev *** 

This is a wrapper for [Ace Editor](http://ace.c9.io/) to provide a 2-panel diffing/merging tool, letting you easily 
visualize differences in two documents and copy changes from one doc to the other. It's built on top of the 
excellent, but appallingly-named [Google-diff-match-patch](https://code.google.com/p/google-diff-match-patch/) library
(*buuuurn*).


### Demo

Take a look at the `gh-pages` branch of this repo for a [demo](http://benkeen.github.io/ace-diff/). This 
is very much a work in progress; I'll update the demo when I finish off the lib. 


### How to install

You can use the script in two ways, depending on your needs. The simplest way to do it is to let the script 
do *everything*: you just pass a target element and it inserts all the appropriate markup for the diffing pane. 
Let's see how that looks. 

```html
<div id="differ"></div>
<script>
var differ = new AceDiff({ 
  element: document.getElementById("differ");
  mode: "ace/mode/javascript",
  left: {
    content: "your first file content here"
  },
  right: {
    content: "your second file content here"
  }
});
</script>
```

Pretty simple. [demo of this here, link]


### Configuration

You can customize your AceDiff instances in a number of ways. 


#### Default settings

Here are all the default settings. I'll explain each below.

```javascript
{
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
```


### API




### Styling



### Browser Support


___________________


#### Remaining TODO
- Drop all dependencies other than the diffing lib
- Sort out the remaining diffing highlight bugs
- place only the appropriate stuff in the prototype

Features to add for version 1:
- go to next/previous diff
- optional scroll locking (horizontal + vertical)
- copy all to right/left
- undo method
- it's pretty opinionated about newline chars. Bug, or acceptable?

#### Appalling slow stuff that can be improved
- don't diff on updateGap()
- diffs the diffs to know when to redraw gap + arrows
- really need to debounce scrolling

### Known limitations
- only one AceDiff per page
