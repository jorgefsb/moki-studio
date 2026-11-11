# Mistakes and lessons

Every serious mistake leaves a rule. The newest goes on top.

- **Nov 8 · The night star that dropped frames.** The threads and string of the stars were redrawn on every frame and at 390 px there were hitches. They are now baked once into a canvas, and we measure twelve runs against master in the same batch. It cost two passes and 104 extra bytes, which the director accepted on purpose. Rule: a drawing that does not change is baked once ([[puerta-de-integracion]]).
- **Nov 7 · Screenshots that lied.** A spark did not show in 8 screenshots and the error was in the script, which cropped wrong. Afterwards there was a real bug: it left the screen. Rule: before fixing the game, frame the thing in the screenshot ([[gauntlet-a-ciegas]]).
- **Nov 8 · Improvements nobody could play.** Almost two weeks announcing improvements that lived where the player does not reach, with the front page from day one. Rule: [[lo-nuevo-se-juega]] and a QA gate before every publication.
- **Nov 8 · Expired AI session.** The studio stood still for 5 hours and nobody saw it. Now the heartbeat detects it and the board shows it in red.
- **Nov 8 · Studio asleep with work pending.** The heartbeat only woke up if something changed; with the studio idle nothing changed. Now it wakes up if there is a queue and asks for a visible jump every 4 hours.
- **Nov 8 · Waiting for data that does not come.** The director waited 24 hours for data and in that time 1 person played. Rule: with no sample, we measure with bots.
- **Nov 8 · Repetitive music.** A single 80 s theme on every level. First we removed the repetition; the new theme comes later, with blind mockups.
- **Nov 8 · Light baked into boxes.** Three attempts without winning blind. We stopped: the problem was the scene's light, not the texture.
- **Nov 7 · Video with three headings and the same music.** We fixed the template and the music changes every day. The published videos were not deleted.
- **Nov 8 · Music that does change, but unheard.** We measured that the first stretch no longer repeats before 300 s (before, 80 s). We learned that "does not repeat" is proven with numbers and "sounds good" is not: that is for Jorge's ear. The first version repeated in 41 of 200 seeds and the guards alone were not enough; we had to add a second chord note.
