## Ace-diff

This is a plugin for [Ace Editor](http://ace.c9.io/) to provide a 2-panel diffing/merging tool that visualizes
differences in two documents and allows users to copy changes from one doc to the other. You've seen it a billion
times; this is an Ace Editor-compatible one. :)

It's built on top of the excellent, but appallingly-named [Google-diff-match-patch](https://code.google.com/p/google-diff-match-patch/)
library (*buuuurn*). That handles the hard part: the actual computation of the document diffs. This lib converts
that raw info into an attractive visual representation on the screen for the user.


### Dependencies

- Ace Editor 1.1.8 or later (probably works on older version, but I haven't confirmed)
- google-diff-match-patch (version?)


### Demos

Take a look at the `gh-pages` branch of this repo for some [demos](http://benkeen.github.io/ace-diff/). The demos
illustrate a few different configurations and styles. Hopefully they'll give you a sense of what it does and how
it works.


### Features

- Compatible with any Ace Editor mode
- Allows realtime diffing of one or both editors
- Readonly option for left/right editors
- full control over all CSS/IDs for styling. This includes styling the actual diffs and the SVG gutter lines.
- optional scroll-locking (scroll one editor and it intelligently scrolls the other based on the diff heights)
- control over how aggressively diffs are combined
- option to either set the editor values by targeting markup containing the code, or by sending it via a config option
- convenient API to do thing like changing options on the fly, getting the number of diffs, destroying it altogether


### How to install

Alrighty! Ace-diff requires you to do three things:
- add some **HTML** to your page that includes three elements: the left editor, right editor, and a gutter element,
- some **JS** to instantiate your `AceDiff` instance and set whatever settings you want,
- some **CSS** to properly style the editors and gutter.

Here's some token code so you can get a sense of how onerous these requirements are. But again, I'd suggest checking
out the [demos](http://benkeen.github.io/ace-diff/) for some hands-on code.

#### HTML

```html
<div>
    <div id="left-editor"></div>
    <div id="gutter"></div>
    <div id="left-editor"></div>
</div>
```

#### Javascript

```javascript
<script>
var differ = new AceDiff({
  mode: "ace/mode/javascript",
  left: {
    id: "left-editor",
    content: "your first file content here"
  },
  right: {
    id: "right-editor",
    content: "your second file content here"
  }
});
</script>
```

#### CSS

Styling the elements is vitally important: the gutter should retain its width even if the user resizes his or her
browser; but honestly the CSS is very much up to you. If you want the ace editor's to change height/width based on a
user's browser, I find using flexbox the best option - but hell, if you want to use a `<table>`, knock yourself out. :)
Take a look at the [demos](http://benkeen.github.io/ace-diff/) for some ideas.


### Configuration

As mentioned in the features section above, you can configure your Ace-diff instances in a few different ways:


#### Default settings

Here are all the default settings. I'll explain each one in details below.

```javascript
{
  mode: null,
  diffGranularity: 'normal',
  lockScrolling: true,
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
    gutterID: 'acediff-gutter',
    diff: 'acediff-diff',
    connector: 'acediff-connector',
    newCodeConnectorLink: 'acediff-new-code-connector-copy',
    newCodeConnectorLinkContent: '&#8594;',
    deletedCodeConnectorLink: 'acediff-deleted-code-connector-copy',
    deletedCodeConnectorLinkContent: '&#8592;',
    copyRightContainer: 'acediff-copy-right',
    copyLeftContainer: 'acediff-copy-left'
  }
}
```

- `mode` (string, required). this is the mode for the Ace Editor, e.g. `"ace/mode/javascript"`. Check out the Ace docs for that. This setting
will be applied to both editors. I figured 99.999999% of the time you're going to want the same mode for both of them so
you can just set it once here. If you're a mad genius and want to have different modes for each side, (a) *whoah man,
what's your use-case?*, and (b) you can override this setting in one of the settings below. Read on.
- `diffGranularity` (string, optional, default: `normal`). this has two options (`normal`, and `broad`). Basically this determines how
aggressively AceDiff combines diffs to simplify the interface. I'll explain this in more detail below under the Diff
Granularity section.
- `lockScrolling` (boolean, optional, default: `true`). This setting locks the scrollbars so that scrolling down one
editor, the other editor scrolls at an appropriate pace - keeping the code as in sync as possible, depending on the
diffs. It's a pretty nice setting so it's enabled by default.
- `left`. this object contains settings specific to the leftmost editor.
- `left.id` (string, optional, default: `acediff-left-editor`). The ID of the element where the leftmost editor will be
created. That element can optionally contain the code you want to syntax highlight. If you don't care about the ID names,
just leave this blank and give you element an ID of `acediff-left-editor`.
- `left.content` (string, optional, default: `null`). If you like, when you instantiate AceDiff you can include the content
that should appear in the leftmost editor via this property.
- `left.mode` 


### Diff granularity

This setting requires a bit more explanation. So I found that when tinkering around with

All the google lib does is return an array of diffs - you could have multiple diffs on a single line, for instance. The
job of AceDiff is to convert that into a human-readable version. So sometimes I found that



### API




### Browser Support

Should be all non-IE browsers, and IE 10 and up. Open a ticket if you find otherwise.


### License

MIT.


### Changelog

- **0.1.0** - March 2015 - initial version



___________________


#### Remaining TODO
- Drop all dependencies other than the diffing lib

Features to add for version 1:
- go to next/previous diff
- copy all to right/left
- undo method

#### Appalling slow stuff that can be improved
- don't diff on updateGap()
