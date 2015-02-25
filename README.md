## Ace-diff

This is an experiment to integrate [Google's diff-match-patch](https://code.google.com/p/google-diff-match-patch/) 
into [Ace Editor](http://ace.c9.io/). 

It's not ready yet, so come back in a week.


#### Remaining TODO

1. ~~Find a Bezier curve algorithm that doesn't look like it's completely demented~~
2. ~~Decide on the overall approach: single `new AceDiff({ ... })` that takes care of everything for you (very plugin-y, 
but less control for devs (you sure?)) or require devs to set up markup, etc.~~
3. Drop all dependencies other than the diffing lib
4. Sort out the remaining diffing highlight bugs

Features to add:
- <<, >> options for the diffs
- go to next/previous diff
- optional scroll locking (horizontal + vertical)
