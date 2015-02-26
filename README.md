## Ace-diff

This is an experiment to integrate [Google's diff-match-patch](https://code.google.com/p/google-diff-match-patch/) 
into [Ace Editor](http://ace.c9.io/). 

It's not ready yet, so come back in a week.


#### Remaining TODO

- ~~Find a Bezier curve algorithm that doesn't look like it's completely demented~~
- ~~Decide on the overall approach: single `new AceDiff({ ... })` that takes care of everything for you (very plugin-y, 
but less control for devs (you sure?)) or require devs to set up markup, etc.~~
- Drop all dependencies other than the diffing lib (argggghhh *deep extend*...)
- Sort out the remaining diffing highlight bugs
- place only the appropriate stuff in the prototype

Features to add for version 1:

- <<, >> options for the diffs
- go to next/previous diff
- optional scroll locking (horizontal + vertical)
- copy all to right/left
- simplifyDiffs()
- documentation


#### Appalling slow stuff that can be improved
- don't diff on updateGap()
- diffs the diffs to know when to redraw gap + arrows


### Known limitations

- only one AceDiff per page
