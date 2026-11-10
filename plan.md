# Datadew Valley: Implementation Plan

## Context
Datadew Valley is an HCI research tool for a Brown University qualitative study (pre-interview, then the simulation, then a post-interview, about 10 participants). It is a top-down 2D pixel-art game, visually inspired by Stardew Valley but using no Stardew assets. Players control Alex, who lives next to a newly built data center. Walking up to "!" markers opens pop-ups about the data center's harms: water contamination, noise, smog, rising bills, and water and power use inside the facility. The goal is to help affluent AI users who don't live near a data center empathize with communities who do. The repo (`joshualbala/Datadew-Valley`) is empty apart from a README, so this is a greenfield build.

**Guiding principle: extensible and data-driven.** The team should be able to add a pop-up, a map area, a cutscene, a website page, or a page section by editing JSON (and Tiled for maps) **without touching engine code**. A new *kind* of thing, such as a new pop-up block type, effect, or interaction, is one small module plus one line registering it.

## Confirmed decisions
| Topic | Decision |
|---|---|
| Hosting | GitHub Pages, static, deployed by a GitHub Action |
| Art | CC0/CC-BY open-source packs plus small custom edits. Credits listed on the About page |
| Pop-up interaction | Walk near a "!" to see a "Press E" hint, then press E/Space (clicking also works). Continue closes the pop-up and the "!" disappears |
| Team | AI-assisted, light JS, so use a mainstream, well-documented stack with **no React** |
| Intro | Click-through illustrated slides with JSON captions, then a black "6 months later" card |
| Flow | Title (Enter) → Intro slides → "6 months later" → Controls pop-up (Continue) → Game |
| Audio | Ambient hum whose volume depends on distance to the data center and peaks inside, plus per-pop-up sound effects. CC0 sounds from Freesound |
| Progression | Free roam; the data center can be entered at any time. Progress counter "3 / 9 read". An ending reflection screen appears once every "!" is read |
| Logging | Local only. Pop-up open/close timestamps and visit order kept in localStorage, with a facilitator "Export session (JSON)" button. Nothing is sent over the network |
| Content | The team writes the text. I ship placeholder text in JSON |
| Devices | Desktop/laptop only. Small or touch screens see a "please use a computer" notice |
| Atmosphere (game) | Desaturated color grade, smog overlay that thickens near the data center, murky river tiles near the outflow, **sparser vegetation** near the data center (cleared land, stumps, fewer trees) |
| JSON | Self-describing (`_description`, `_usedIn`, `_location`); see below |
| Required pop-ups | Detailed designs from the spec addendum (see "Required pop-ups") |

## Required pop-ups (spec addendum)
Each design below is built from the generic pieces (map hotspot, HUD widget, pop-up blocks), so its text, numbers, sounds, and images all live in JSON.

| # | Pop-up | Where | Visual / interaction | JSON-configurable |
|---|---|---|---|---|
| 1 | **Contaminated water** | Valley map, river | River tiles are a **light brown** murky color. The hotspot is the river itself: when Alex is near, a soft glow outline **highlights the water**, and pressing E opens the pop-up | Text, highlight color, which river area (Tiled `hotspot` polygon) |
| 2 | **Noise pollution** | **HUD**, a small speaker button in a screen corner | Volume bars show the current noise level, rising as Alex nears the data center and maxing out inside. **Clicking it plays an audio recording of being inside/near a data center** and opens a pop-up about the audio experience of living near one. The pop-up has an `audioPlayer` block (play/pause/volume) | Recording file, text, noise-level source and range |
| 3 | **Air quality / smog** | Valley map, near the data center | Smog overlay (atmosphere effect) plus a standard "!" hotspot | Text, smog parameters |
| 4 | **Electricity and water bills** | Valley map, Alex's mailbox | A floating red **"-$"** indicator bobs above the mailbox. The pop-up shows a **bill visualization**: line items for before and after the data center (electricity, water), each increase in red, and a bold **"You now owe $X"** total. Uses a new `bill` block | All amounts, labels, currency, text |
| 5 | **Individual health** | **HUD**, Alex's portrait and name (top-left) | The portrait shows Alex **upset and sickly** after the data center (a healthy portrait is used in the intro slides). Clicking the portrait or name opens a pop-up on the **physical and mental health** impacts. Portrait states are switchable in JSON | Portrait images per state, text |
| 6 | **Water usage (inside)** | Data center map, cooling system | Standard "!" hotspot. The text covers water usage and why data centers draw **municipal (treated) water**: it has fewer minerals that could scale or damage the cooling infrastructure | Text, optional `stat` blocks (e.g. gallons/day) |

The other hotspots stay (`vegetation-loss`, `community`, `gpu-racks`, `electricity-usage`). Two HUD-based pop-ups (noise, health) count toward completion like map pop-ups. Once read, their attention pulse stops, but the buttons stay clickable so the recording can be replayed.

**Assumptions** (easy to change in JSON):
- The bill shows a one-time "you now owe" total, not a running money counter.
- Alex's portrait has two states (healthy, sickly) rather than worsening gradually.
- The noise recording plays on click only; the ambient distance-based hum keeps playing separately.

## Recommended tech stack
- **Vite + TypeScript** for the build tool and dev server. The simple config and fast reload make it a good fit for AI-assisted iteration.
- **Phaser 3** (3.90; Phaser 4 exists, but 3.x has the most examples and AI familiarity) as the 2D game engine. It handles tilemaps, arcade physics and collisions, cameras, sound with volume control, particles, and post-FX (`colorMatrix` desaturate). It has the most tutorials and examples, so AI coding tools know it best.
- **Tiled** (open-source map editor) for every map. Its JSON export loads directly into Phaser. Hotspots, doors, spawn points, and effect zones are Tiled objects with properties, so the team places and moves them visually.
- **Plain TS + DOM** for the website shell, pages, and pop-up overlays. A tiny hash router (`#/about`) is used because it works on GitHub Pages with no server config.
- **Zod** to validate every content JSON file at load time and in CI, so a typo shows a clear error instead of a blank screen.
- **Pixel font:** "Jersey 10" (OFL, bundled via @fontsource), picked for legibility after comparing Pixelify Sans, Press Start 2P, VT323, Silkscreen, Tiny5 and DotGothic16. Change it in one place: `FONT` in `src/game/constants.ts`.
- **Testing:** Vitest (schemas and cross-reference checks) and Playwright (smoke test).
- **CI/CD:** a GitHub Action that lints, tests, builds, and deploys to Pages (Vite `base: '/Datadew-Valley/'`).

### Open-source assets and tools
- Art: **Kenney.nl** (CC0: Tiny Town, RPG Urban Pack for the data center building and interior), **Cup Nooks "Sprout Lands"** (check its license tier), **LPC / OpenGameArt** (characters, scientists), **itch.io** CC0 tag.
- Editing: **LibreSprite** (open-source Aseprite fork) or **Piskel**. Map: **Tiled**.
- Audio: **Freesound.org** (CC0: server hum, HVAC, fans, water), **Kenney audio**.

### Tools for AI-heavy coding
- **Claude Code** with a project `CLAUDE.md` covering the stack, folder layout, the rule that all text lives in `/content`, and **step-by-step recipes** (add a pop-up, scene, page, block type, or effect) so AI edits follow the extension patterns instead of hard-coding.
- **Context7 MCP** for current Phaser and Vite docs, and **Playwright MCP** so the AI can screenshot and check the running game.
- **ESLint + Prettier** with `lint-staged` pre-commit. Phaser's official **`create-phaser-game` Vite+TS template** as the starting point.
- Small PRs per milestone, with CI guarding each one.

## Architecture: built for extension

### Extension points (the "registries")
Each extension point is a JSON registry for content and a TS registry (`Record<type, handler>`) for behavior. Engine code only loops over registries and never names specific content.

| To add… | Edit | Code needed? |
|---|---|---|
| A pop-up / "!" | Entry in `content/hotspots/<scene>.json` + Tiled object with same `id` | No |
| A new map area (e.g. school, hospital, the town) | Tiled map + entry in `content/scenes.json` + a `door` object linking to it | No |
| A cutscene / slideshow (intro, ending, new story beat) | File in `content/sequences/` + step in `content/flow.json` | No |
| A step in the game flow | Entry in `content/flow.json` (title → sequence → card → popup → scene) | No |
| A website page | Entry in `content/site.json` (nav label, route, list of sections) | No |
| A section on a page | Section object (`type: "people" \| "text" \| "bibliography" \| "game" \| "image"…`) | No |
| A HUD widget (e.g. portrait, audio button, money counter) | Entry in `content/hud.json` (type, position, pop-up id, images) | No, for existing types |
| A new HUD widget type | One module in `src/game/hud/` + register | Small |
| A new pop-up content block (e.g. chart, before/after slider, quote) | One renderer in `src/ui/blocks/` + register | Small |
| A new atmosphere effect (e.g. rain, flicker) | One module in `src/game/effects/` + register; enable per scene in JSON | Small |
| A new interaction type (e.g. NPC dialogue, collectible bill) | One handler in `src/game/interactions/` + register | Small |
| A new page section type | One renderer in `src/site/sections/` + register | Small |

### Key generic pieces
- **One generic `MapScene`** runs *any* Tiled map, driven by its `scenes.json` entry (`id`, `map`, `tilesets`, `spawn`, `ambience`, `effects[]`). The Valley and the Data Center are just two entries, with no per-scene classes.
- **Tiled object types** are interpreted through the interaction registry: `hotspot` (opens a pop-up), `door` (`targetScene`, `targetSpawn`; shows "Enter"), `spawn`, `soundSource` (distance-based audio, e.g. the hum), `effectZone` (e.g. smog density). Unknown types log a warning instead of crashing.
- **Pop-up bodies are lists of typed blocks**, e.g. `[{type:"text"}, {type:"image"}, {type:"stat", value:"5M gal/day"}, {type:"audioPlayer", src}, {type:"bill", items:[{label, before, after}], totalLabel}, {type:"citation"}]`, so content can grow richer without code changes.
- **Pop-ups live in one pool** keyed by `id`. A pop-up can be opened by a map hotspot, a HUD widget, or a flow step (e.g. the controls pop-up), so any trigger can reuse any pop-up.
- **HUD widgets** (`content/hud.json`): `portrait` (images per state, name label, click opens a pop-up), `audioButton` (recording, level source, click plays it and opens a pop-up), and `progress` (the counter). Widgets can be shown or hidden per scene.
- **Hotspot shapes:** a point ("!" marker) or a **Tiled polygon area** (glow highlight on the area, e.g. the river). Hotspots have optional `indicator` (`"!"` | `"-$"` | custom image) and `highlightColor`.
- **Effects** are listed per scene in JSON with parameters, e.g. `{"type":"desaturate","amount":0.6}`, `{"type":"smog","source":"datacenter","maxAlpha":0.5}`.
- **Progress is derived automatically.** The total "!" count comes from all hotspot files, so new pop-ups update the counter and the ending trigger with no extra wiring. Each hotspot has an optional `countsTowardCompletion` flag.
- **Site shell:** `content/site.json` defines the nav and pages. Each page is an ordered list of sections, and the simulation page is a page with a `game` section plus Reset and Export controls.
- **Content loader:** one `loadContent()` fetches the files, validates them with Zod, and **cross-checks references** (hotspot ↔ Tiled object, door → existing scene, flow → existing sequence, asset paths exist). Every file has `schemaVersion` so formats can change later without breaking old content.

### Folder layout
```
Datadew-Valley/
├─ index.html                 # single entry; hash-routed site shell
├─ public/
│  ├─ content/                # ALL editable text and config, edited only here
│  │  ├─ README.md            # file → screen map, screenshots, "how to add X" recipes
│  │  ├─ site.json            # nav + pages + sections
│  │  ├─ flow.json            # ordered game flow steps
│  │  ├─ scenes.json          # map areas: map file, spawn, ambience, effects
│  │  ├─ ui.json              # title, controls text, labels, ending text
│  │  ├─ hud.json             # portrait (health), audio button (noise), progress counter
│  │  ├─ hotspots/            # one file per scene: valley.json, datacenter.json
│  │  ├─ sequences/           # intro.json, ending.json (slides)
│  │  ├─ about.json           # [{name, image, description}]
│  │  └─ bibliography.json    # [] by default; [{citation, annotation, url?}]
│  ├─ maps/                   # Tiled JSON maps
│  └─ assets/                 # tilesets, sprites, slides, audio, CREDITS.md
├─ src/
│  ├─ main.ts                 # boots site shell
│  ├─ content/                # loader.ts, schemas.ts (Zod), crossRefs.ts
│  ├─ site/                   # router.ts, nav.ts, sections/ (people, text, bibliography, game…)
│  ├─ game/
│  │  ├─ game.ts              # Phaser config; registers MapScene, SequenceScene, TitleScene
│  │  ├─ scenes/              # MapScene.ts (generic), SequenceScene.ts, TitleScene.ts
│  │  ├─ interactions/        # hotspot.ts, door.ts, soundSource.ts, effectZone.ts, index.ts
│  │  ├─ effects/             # desaturate.ts, smog.ts, index.ts
│  │  ├─ hud/                 # portrait.ts, audioButton.ts, progress.ts, index.ts
│  │  ├─ flow.ts              # runs flow.json steps
│  │  └─ player.ts
│  ├─ ui/                     # popup.ts, blocks/ (text, image, stat, audioPlayer, bill, citation, index.ts)
│  └─ state/                  # progress.ts (localStorage, reset), sessionLog.ts (export)
└─ .github/workflows/deploy.yml
```

### Self-describing content JSON
JSON can't hold comments, so files and entries carry `_`-prefixed metadata fields that Zod strips and the game never displays.
- **File level:** `_description` (what it controls, including a short guide to each field) and `_usedIn` (which page or scene reads it).
- **Entry level:** `_location`, a plain-English place in the game, and optional `_notes`.
- **Matching IDs:** each hotspot `id` is identical to its Tiled object's `id` property. The same applies to door `targetScene` and the IDs in `scenes.json`.
- **`public/content/README.md`:** a table mapping each file to the screen it controls (with screenshots) and recipes for non-coders.
- **`?debug=1`** shows marker IDs, door targets, and effect zones in the game.

Example `hotspots/valley.json`:
```json
{
  "schemaVersion": 1,
  "_description": "Pop-ups for the Valley map. 'id' must match the hotspot object's id in maps/valley.json. 'body' is a list of blocks: text | image | stat | sound | citation.",
  "_usedIn": "Simulation page → Valley scene",
  "hotspots": [
    {
      "id": "river-contamination",
      "_location": "Valley: river bank south of the data center fence",
      "title": "PLACEHOLDER: Contaminated River",
      "body": [
        { "type": "text", "text": "PLACEHOLDER paragraph" },
        { "type": "citation", "text": "PLACEHOLDER (Author Year)" }
      ],
      "countsTowardCompletion": true
    }
  ]
}
```

**Starting hotspots** (placeholders; extend freely):
- Valley map: `river-contamination` (polygon over the brown river), `air-quality-smog`, `bills` (mailbox, `-$` indicator), `vegetation-loss`, `community`. The data center gate is a `door` object.
- HUD: `noise-pollution` (audio button), `individual-health` (Alex portrait).
- Data center map: `gpu-racks`, `cooling-water-usage` (municipal water), `electricity-usage`, plus decorative scientist NPCs and an exit `door` on the far right back to the gate.

**State:** `{ readHotspots, currentScene, playerPos, flowStep, sessionLog }` is stored in localStorage under a versioned key. **Reset** clears it and returns to the Title screen. **Export session** downloads `datadew-session-<timestamp>.json` (optional participant code, pop-up open/close times, durations, order, completion time).

## Build steps
Each step is small and ends in something you can check yourself. **Workflow:** I build one step → you run the "Test it" checklist → you commit → we move on. Steps use placeholder art until Step 13.

| # | Step | Test it (done when…) |
|---|---|---|
| 1 | **Project setup + opening page.** Vite + TS + Phaser 3, `ui.json`/`audio.json` + Zod loader, "Click anywhere to begin" start screen (unlocks sound), bright pixel title screen (town hall left, data center right) with "Datadew Valley" and an Enter button, upbeat cozy synth melody "Picnic" + mute (M), `CLAUDE.md`, content tests | `npm run dev` shows the start screen; clicking plays the melody and shows the title screen. Enter (click or key) fades out. Editing the title in `public/content/ui.json` changes it on reload. Broken JSON shows a readable error. `npm test` and `npm run build` pass |
| 2 | **Intro slides + "6 months later".** `flow.json` runner, generic `SequenceScene`, `sequences/intro.json` | Enter leads to click-through slides with captions from JSON, then a black "6 months later" card. Adding a slide in JSON shows it |
| 3 | **Controls pop-up.** DOM pop-up, block registry (`text`, `image`, `stat`, `citation`) | After "6 months later", the controls pop-up appears with an audio note. Continue closes it |
| 4 | **Valley map + Alex walking.** Generic `MapScene`, `scenes.json`, placeholder Tiled map, WASD/arrows, collisions, camera follow | Alex walks around, can't walk through water/buildings, the camera follows |
| 5 | **"!" hotspots + progress + Reset.** Hotspot interaction, "Press E", pop-up opens, "!" disappears, localStorage, Reset button | Every Valley "!" opens its JSON text. Read ones stay gone after reload. Reset returns to the title |
| 6 | **Data center: enter and exit.** `door` interaction, interior map, scientists, exit door on the right | "Enter" at the gate goes inside, interior "!" work, the exit door returns Alex to the gate |
| 7 | **HUD.** Progress counter, Alex portrait (sickly) → health pop-up, noise button → recording + pop-up | Counter shows "x / N" and updates. Clicking the portrait and the speaker opens their pop-ups. The recording plays |
| 8 | **Special pop-ups.** `bill` block + `-$` indicator, `audioPlayer` block, brown river with polygon glow | The mailbox shows `-$` and the bill pop-up. The river glows near Alex and opens its pop-up |
| 9 | **Atmosphere + sound.** Desaturation, smog by distance, distance-based hum feeding the noise bars, mute | The valley looks muted, smog and hum grow near the data center, mute works |
| 10 | **Ending screen.** Ending sequence after all pop-ups are read | Reading the last pop-up leads to the reflection screen |
| 11 | **Website shell + deploy.** Hash router, nav from `site.json`, About and Bibliography from JSON, GitHub Pages Action | Nav switches pages, Bibliography shows an empty state, the site works on the Pages URL |
| 12 | **Study tooling.** Session log + Export JSON, small-screen notice, `?debug=1` | The export file has the correct order and durations. Phone-size windows see the notice. Debug shows marker IDs |
| 13 | **Real art + Tiled maps.** Asset packs, both maps, Alex portraits, sparse vegetation, CREDITS | The game looks like the visual style reference. All IDs still match (tests pass) |
| 14 | **Hardening.** Cross-reference tests (hotspot ↔ map, doors, assets), Playwright smoke test, ESLint/Prettier, `content/README.md` | `npm test` catches a mismatched ID. The smoke test passes in CI |
| 15 | **Extensibility proof + pilot.** Add a test area and page using only JSON/Tiled, then remove them. Pilot with 1–2 people | Both appear without code changes. Pilot notes are collected |

## Remaining open items for the team (do not block the build)
- Final pop-up text and citations, intro slide captions, About Us bios and photos.
- Final asset pack choice and a license check.

## Verification
- `npm run dev` to play through Title → Intro → Controls → Valley → every "!" → enter data center → every interior "!" → exit → Ending.
- Each "!" disappears after Continue, and the counter updates. Progress persists after a reload. Reset returns to an unplayed state.
- **Required pop-ups:** the river is light brown and glows when Alex is near, and pressing E opens its pop-up. The noise button's bars rise near the data center, and clicking it plays the recording and opens its pop-up. The mailbox shows `-$`, and its pop-up shows before/after bills in red with the "You now owe" total. The sickly Alex portrait opens the health pop-up when clicked. The interior water pop-up covers municipal water. All six count toward completion.
- The hum rises nearer the data center and the smog thickens. Mute works. Export produces valid JSON with the correct order and durations.
- **Extensibility checks:** (a) add a hotspot to the JSON and Tiled, then reload: it appears and the total count goes up; (b) add a scene and a door: it is reachable; (c) add a page in `site.json`: it appears in the nav; (d) add a slide: the intro shows it. None of these need code changes.
- Vitest fails on a missing `_description`/`_location`, an unmatched hotspot ↔ Tiled ID, a door to an unknown scene, or a missing asset. Malformed JSON shows a clear error in the browser.
- About and Bibliography render from JSON, and the Bibliography shows an empty-state message by default.
- The Playwright smoke test passes. The GitHub Action deploys, and the Pages URL works.
