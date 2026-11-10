# Datadew Valley

Educational pixel-art simulation of living next to a data center (Brown HCI research project). Full plan, decisions, and the step list: `plan.md`.

## Stack
Vite + TypeScript + Phaser 3.90 (not Phaser 4), Zod 4 for content validation, Vitest. No React. Static site for GitHub Pages (`base: './'`).

## Commands
- `npm run dev` (dev server) · `npm test` (content + unit tests) · `npm run typecheck` · `npm run build`

## Rules
- **All user-facing text lives in `public/content/*.json`.** Never hard-code copy in TS (the only exception is temporary dev placeholders, marked TEMPORARY).
- Every content file has `schemaVersion`, `_description` (what it controls + field guide), and `_usedIn` (which page/scene reads it). Entries that appear in the game have `_location`. `_`-prefixed fields are human notes, which Zod strips.
- Extend through registries, not special cases: content files are registered in `src/content/files.ts`; scenes in `src/game/game.ts`. Engine code should never mention specific content IDs.
- Scenes import constants from `src/game/constants.ts` (not `game.ts`, which would cause a circular import).
- Internal resolution is 960×540. Placeholder art uses `PixelPainter` (`src/game/art/pixel.ts`) on a 2px grid (art grid 480×270); bake static scenery into one texture with `makeTexture` instead of redrawing Graphics every frame.
- All sound goes through the `audio` singleton (`src/game/audio/audioManager.ts`): it unlocks on the first click/keypress (browser rule), handles mute (M key / `addMuteButton`), and plays music tracks defined in `public/content/audio.json`.
- Work happens in numbered steps (see `plan.md` → Build steps). Finish one step, make sure `npm test`, `npm run typecheck`, and `npm run build` pass, then stop for the user to test and commit.

## Recipes
**Add a content file:** create `public/content/<name>.json` with the meta fields → add a schema in `src/content/schemas.ts` using `contentFile({...})` → register it in `src/content/files.ts`. It is then loaded at startup (`getContent().<name>`) and checked by `tests/content.test.ts` automatically.

**Add a scene:** create `src/game/scenes/<Name>Scene.ts` → add it to the `scene` list in `src/game/game.ts`.

**Add a flow step type:** add its schema to `FlowStepSchema` in `src/content/schemas.ts` → add a handler in `src/game/flow.ts` (usually `scene.scene.start('<Scene>', step)`); the scene calls `flow.next(this)` when done.

**Add a slide illustration:** all art is drawn in code (no image files). Create `src/game/art/illustrations/<name>.ts` exporting an `Illustration` (`paint` = still parts on the art grid: 420×180 by default, or set `scale: 3` to zoom in on a 280×120 grid, `animate` = moving sprites via the `IllustrationStage`; see `valleyHome.ts`, helpers in `common.ts`) → register it in `illustrations/index.ts` → list its name in the sequence file's `_description`. Keep illustrations free of Phaser value imports so tests can paint them.

**Add a slideshow:** create `public/content/sequences/<name>.json` (`music` = optional track key from `audio.json`, `slides: [{ illustration, caption }]`) and reference it from a `sequence` step in `flow.json`; the loader loads any sequence that `flow.json` refers to (see `contentCollections` in `src/content/files.ts`).

**Add a pop-up / "!":** pop-up in `public/content/popups.json` → hotspot `{ id, popup, x, y }` in `public/content/maps/<map>.json`. No code.

**Add a pop-up block type:** schema in `BlockSchema` (`src/content/schemas.ts`) → renderer in `src/ui/blocks/index.ts` → CSS in `src/styles.css`.

**Add a map tile kind:** entry in `kinds` (`src/game/map/kinds.ts`: ground, walkable, optional `size` and `object` sprite) → use it in a map's `legend`. Maps are letter grids parsed and validated by `src/game/map/grid.ts`; tiles are 16 art px drawn at `MAP_SCALE` 3.

**Add a HUD widget type:** schema in `HudWidgetSchema` (`src/content/schemas.ts`) → factory in `widgetTypes` (`src/game/hud/widgets.ts`) → entry in `public/content/hud.json`. Widgets with `countsTowardCompletion` count in "x / N read" automatically.

**Add a map effect:** factory in `effects` (`src/game/effects/index.ts`) → list it in a map's `effects` in JSON.

**Add a synthesized sound:** generator in `src/game/audio/recordings/` → register in `recordings/index.ts` → `"synth": "<name>"` under `sounds` in `audio.json`; play with `audio.sound(key, def)` (loop handle) or `audio.sfx(name)` for short effects (`src/game/audio/sfx.ts`).

**Add music:** either drop an mp3/ogg in `public/assets/audio/` and add a track with `"file": "assets/audio/x.mp3"` in `audio.json`, or write a synth song in `src/game/audio/songs/<name>.ts` (see `meadow.ts`), register it in `songs/index.ts`, and use `"synth": "<name>"`. Play it from a scene with `audio.playMusic('<trackKey>', getContent().audio.music.<trackKey>)`.
