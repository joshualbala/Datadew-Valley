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
| `ui.json` → `popup`, `map` | The pop-up "Continue" label, the "Press E" hint and the "x / N read" counter text | Pop-ups, game map |
| `popups.json` | Every pop-up window: title, body blocks (text, big numbers, citations, pictures, key caps) and button label. The file's `_description` lists the block types | Controls pop-up, every "!" |
| `maps/valley.json` | The valley layout as a grid of letters (the `legend` says what each letter is), where Alex starts, and the "!" markers (`hotspots`: which pop-up, which tile) | The game map |
| `hud.json` | Alex's portrait and name (top-left, opens the health pop-up) and the noise button (bottom-left: volume bars, recording, background hum) | Screen corners during the game |
| `audio.json` → `sounds`, `sfxVolume` | The data center recording (built-in synthesized, or a real file) and the volume of small effects (pop-up chimes, footsteps) | Noise pop-up, background hum, everywhere |
| `audio.json` → `music` | Which melody plays and how loud (`volume` 0–1). Use `"synth": "meadow"` for the built-in tune, or `"file": "assets/audio/your-song.mp3"` for a real recording | Opening page and intro |

## Recipes
- **Change a slide's text:** edit its `caption` in `sequences/intro.json`.
- **Add a slide:** copy a slide block in `sequences/intro.json`, change the `caption`, and pick an `illustration` from the list in `_description` (one picture can be reused). A brand-new picture has to be drawn in code, so ask a developer or Claude.
- **Change the intro music:** `sequences/intro.json` → `music` names a track in `audio.json` (currently `intro`, the slow "overcast" melody).
- **Change a pop-up's text:** find its id in `popups.json` and edit `title` or the `text` of its blocks.
- **Add a "!":** add a pop-up to `popups.json`, then add a hotspot to `maps/valley.json` → `hotspots` with that `popup` id and a tile (`x` = column, `y` = row, counting from 0; it must be a walkable tile). The counter's total goes up by itself.
- **Move a tree or building:** edit the letters in `maps/valley.json` → `grid`. Keep every row the same length and bigger things as full blocks (car 2×1; cottage and the three house styles 3×2; shop 4×2; town hall 8×3; data center 9×3). Make roads 2 tiles wide so the lane lines draw. The file's `_description` lists every tile kind. `npm test` points out mistakes.
- **Change the bill amounts:** `popups.json` → `bills` → the `bill` block's `items` (`before`/`after`), `totalLabel`, and optional `total`.
- **Use a real data center recording:** put the file in `public/assets/audio/` and change `audio.json` → `sounds` → `datacenter` to `"file": "assets/audio/your-file.mp3"` (remove `"synth"`).
- **Add or move a neighbor:** `maps/valley.json` → `npcs`: pick a `look` (0–9), a `mood` (`sad` or `angry`), a walkable start tile and how far they `wander`. They cough when Alex walks by.
- **Alex's cough:** `audio.json` → `alexCoughSeconds` (`[min, max]` seconds between coughs; `[0, 0]` turns it off).
- **Make the valley more or less gloomy:** `maps/valley.json` → `effects` (desaturate amount, smog radius and strength, cloud shadows) and `dryness` (how far the grass dries out around the data center).
- **Change "6 months later":** edit the `card` step's `text` and `holdSeconds` in `flow.json`.

More files are added as later steps are built (pop-ups, HUD, About, Bibliography).
