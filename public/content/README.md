# Content files: what controls what

Everything players read is set here. Edit a file, save, and reload the browser. If a file is broken, the game shows an error naming the file and the problem. Run `npm test` to check every file at once.

Every file starts with:
- `_description`: what the file controls, plus what each field means
- `_usedIn`: which page or screen uses it

Fields starting with `_` are notes for the team and never appear in the game.

| File | Controls | Where you see it |
|---|---|---|
| `ui.json` → `start` | "Click anywhere to begin" text and the sound note | First screen (needed so the browser allows sound) |
| `ui.json` → `title` | Game name, optional tagline, Enter button label, hint text | Opening page |
| `audio.json` → `music` | Which melody plays and how loud (`volume` 0–1). Use `"synth": "meadow"` for the built-in tune, or `"file": "assets/audio/your-song.mp3"` for a real recording | Opening page and intro |

More files are added as later steps are built (intro slides, pop-ups, HUD, About, Bibliography).
