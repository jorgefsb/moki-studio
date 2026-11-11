# Integration gate

A piece goes into master only if the tester passes it with their own numbers:

- Classic still gives the same result with the same seed (2142, 78 of 78) and the Challenge is the same twice.
- Frames per second do not get worse at 375 and 390 px, measured against master in the same batch. Since the night star (Nov 8): 12 runs against 12, alternated, in the same batch; two weak runs can be noise, 37 long frames against 3 cannot.
- Console without errors.
- The initial JavaScript does not grow by much. If a piece goes over the cap, we say so and the director decides: the night star went +352 bytes against a cap of +300 because the excess fixed a real hitch.
- It won its [[gauntlet-a-ciegas]] if it is something you can see.

Since Nov 8 also: the tester leaves a screenshot of how a new player sees it and says where it shows. See [[lo-nuevo-se-juega]].

Before publishing, the site's QA gate checks that the main game is today's version, rebuilds the front page and the news, and checks that every link exists.
