## Ace-diff

This is an experiment to integrate [Google's diff-match-patch](https://code.google.com/p/google-diff-match-patch/) 
into [Ace Editor](http://ace.c9.io/). 

The code is an absolute dog's breakfast right now, so don't look too closely. I'm just tinkering around with the big 
pieces to get a sense of how Ace + the diffing lib works, so it'll undergo a giant overhaul once it's complete. 


#### Remaining TODO

1. ~~Find a Bezier curve algorithm that doesn't look like it's completely demented~~
2. Decide on the overall approach: single `new AceDiff({ ... })` that takes care of everything for you (very plugin-y, 
but less control for devs (you sure?)) or require devs to set up markup, etc.
3. Drop all dependencies other than the diffing lib
4. Add <<, >> options for the diffs
5. Sort out the remaining diffing highlight bugs
