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
| `ui.json` → `sequence` | "Click or press Enter to continue" hint and the Back button label | Intro slides (caption box) |
| `flow.json` | The order of screens after Enter: which slideshow plays, then the black "6 months later" card (its text and how many seconds it stays) | Everything between the title and the game |
| `sequences/intro.json` | The intro slides: each slide's caption and which picture it shows. Add, remove or reorder slides here. The pictures are drawn in code; the file's `_description` lists the available names | Intro slides |
| `audio.json` → `music` | Which melody plays and how loud (`volume` 0–1). Use `"synth": "meadow"` for the built-in tune, or `"file": "assets/audio/your-song.mp3"` for a real recording | Opening page and intro |

## Recipes
- **Change a slide's text:** edit its `caption` in `sequences/intro.json`.
- **Add a slide:** copy a slide block in `sequences/intro.json`, change the `caption`, and pick an `illustration` from the list in `_description` (one picture can be reused). A brand-new picture has to be drawn in code, so ask a developer or Claude.
- **Change the intro music:** `sequences/intro.json` → `music` names a track in `audio.json` (currently `intro`, the slow "overcast" melody).
- **Change "6 months later":** edit the `card` step's `text` and `holdSeconds` in `flow.json`.

More files are added as later steps are built (pop-ups, HUD, About, Bibliography).
