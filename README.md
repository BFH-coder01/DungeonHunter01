# DungeonHunter01

Browser-based, procedurally generated dungeon crawler for play over the home
wifi. One machine runs the server; everyone else joins from a browser on the
same network. No installs, no accounts — just a URL.

There are two ways to view the dungeon:

- **Participant view** (`/`) — first-person. You're in the dungeon: a
  raycasted wireframe view of corridors and rooms, WASD movement, mouse-look,
  inventory, HUD, the works.
- **DungeonMaster view** (`/dm.html`) — spectator. A top-down overview of the
  whole level and every adventurer on it, live. No character, no fog — this
  is the "big screen" for whoever's hosting.

## v01 scope

- Procedural dungeon: random 1–10 levels (rooms + corridors), random weapon
  caches, random player spawn points.
- Players join from a browser, get assigned a random spawn point; on death
  they respawn at a different random spawn point.
- Per-player HUD with fog-of-war — only the parts of the dungeon a player has
  explored are drawn for them (a small corner minimap in the first-person
  view, or the full top-down layout in the DM view).
- Random per-player attributes (health, mana, move speed); caches can raise
  *or* lower an attribute when looted (it's a gamble).
- Inventory with pickup/drop. Weapons are held and must be **equipped**
  (stop-and-swap, ~0.9s) — no hotkey instant-switching. Spells are known, not
  held, so casting is immediate as long as mana and cooldown allow it.
- Other living players appear in first person as unlabeled hooded hunters.
  When one is killed, their fallen avatar briefly displays their name during
  the respawn window; living-player names and health remain hidden.

### Current test configuration

For initial testing, [src/shared/config.js](src/shared/config.js) pins the
generator to a **single level** and sets `revealAll: true` so the whole
dungeon is visible immediately instead of being fogged. Flip those back
(`levels.fixed = null`, `revealAll = false`) once we're ready to test the
real multi-level / fog-of-war behaviour. Note that with `revealAll` on, the
first-person view's minimap will show the entire level from the start too —
that's expected; it only reflects real fog-of-war once the flag is off.

## Running it

```bash
npm install
npm start
```

The server prints a LAN URL (e.g. `http://192.168.1.23:8080`) — open that on
any device on the same wifi to join, or add `/dm.html` for the spectator
view. `npm run dev` restarts on file changes.

## Layout

```
src/
  shared/     constants, config, RNG, item tables — used by server AND client
  server/     authoritative simulation: dungeon generation, game state, ws/http server
public/
  index.html, client.js   participant first-person view
  dm.html, dm.js          DungeonMaster spectator view
  style.css               shared styling for both
```

The client fetches shared code straight from `/shared/*` — server and browser
run the exact same constants/config/item definitions, so there's no
duplication to drift out of sync.

## Controls — participant view

- Forward/back: W/S or ↑/↓
- Strafe left/right: A/D
- Turn: mouse-look (click the view to capture the pointer; Esc releases it)
  where the browser/environment supports pointer lock, or hold ←/→ for a
  smooth continuous turn otherwise. An earlier version used a discrete
  keyboard snap-turn, which yanked your facing (and therefore "forward")
  straight into a wall mid-corridor — holding to turn gradually doesn't have
  that problem.
- Attack (equipped weapon): left click
- Cast (equipped spell): right click / space
- Open a cache / pick up a floor item: E or O. Caches can be opened from
  about a tile away; loose floor items need you standing on them.
- Inventory: click a slot to equip it, right-click a slot to drop it. Number
  keys 1–8 also equip a slot.

The DungeonMaster view has no controls — it's a read-only overview. Just open
`/dm.html` and watch.

## Ambient sound

The participant view has two audio systems ([public/audio.js](public/audio.js)),
both built on real (user-supplied) audio files in `public/sfx/`, not
procedural synthesis. Two earlier passes tried generating ambience
procedurally — first live via Web Audio oscillators, then offline-rendered
with layered/detuned oscillators and hand-rolled biquad filters for more
headroom — and both were dropped as too harsh/artificial to keep. That's a
real, known ceiling on hand-synthesised sound design without actual
recordings, not something more tuning was going to fix.

Voice chat/proximity mic audio was considered and deliberately **not**
built — it needs HTTPS (`getUserMedia` requires a secure context, and a
plain LAN IP doesn't qualify) for a payoff the group doesn't need, since
everyone's expected to just talk out loud on the same wifi/in the same
house.

**Footsteps** (`footsteps.wav`, a ~36s continuous walking sequence, not a
single step hit) — used as a loopable "walking" bed rather than triggered
per-stride: looped for as long as a player is moving, faded out (not cut)
when they stop.
- **Self** plays centered, quiet (immersion). **Other players** are
  positioned via a Web Audio `PannerNode` at their live position — audible
  out to ~16 tiles — so you can hear someone nearby before you see them.
  "Moving" for other players is inferred from snapshot-to-snapshot position
  deltas (their input state isn't known to us, only their position); for
  yourself it's read directly from held movement keys.

**Ambient points** — 12 authoritative points are placed on floor tiles when
each seeded dungeon level is generated. Their locations, 1-3 assigned clips,
and individual/group mode are therefore identical for every participant and
visible in full on the DungeonMaster map. A player receives a point only when
they approach its audible radius. Each clip runs on its own timer (the interval
scales with the clip duration so a 38s clip does not retrigger every 15s).
**Individual** clips have nearby within-tile source positions; **group** clips
share one exact-position panner. Web Audio applies directional panning and
linear distance attenuation out to ~10 tiles. Ambient radius, reference
distance, and gain are configured centrally in `src/shared/sounds.js` without
changing footstep volume.

The listener (camera) position/orientation for both systems is updated
every frame from the same `renderX`/`renderY`/`viewAngle` the renderer
uses, so direction matches what's on screen.

## Architecture notes

- The server is authoritative for everything — position, combat, inventory.
  Clients only ever send movement intent (`mx`, `my`, view angle) and
  discrete actions (attack/cast/pickup/drop/equip); they never assert state.
- The first-person renderer is a classic grid-DDA raycaster (Wolfenstein-style).
  Walls, floor and ceiling are all texture-mapped with procedurally-generated
  stone textures (drawn once to an offscreen canvas at load — no image
  assets, no build step) rather than real photos, partly to keep the
  zero-dependency architecture and partly to sidestep licensing questions
  around using stock photography or 3D-model-site assets as game content.
  Walls are drawn per-column via `drawImage` (`RAYS` columns, not full pixel
  width — deliberately chunky/retro and cheap); floor/ceiling use true
  per-pixel row casting into an `ImageData` buffer (Lode's tutorial
  technique — distance is constant across a screen row for a flat, unrolled
  camera, so it's computed once per row and stepped linearly), sampled in 2x2
  blocks to keep the per-frame cost down. Distance fog fades everything
  toward the same near-black tone at the dungeon's sight radius; N/S vs E/W
  wall faces use different texture tints so corners and corridors stay
  legible. The DungeonMaster view and the minimap stay wireframe/schematic —
  only the Hunter's main view is textured.
- The DungeonMaster connection is a distinct protocol path (`MSG.SPECTATE`)
  from joining as a player (`MSG.JOIN`) — a spectator never gets a character,
  never consumes a spawn point, and always sees the full level regardless of
  the `revealAll` flag.
- Mouse-look is fully client-predicted (the view angle never waits on a
  server round-trip); player *position* is not — it's rendered straight from
  ~20Hz server snapshots with light exponential smoothing to take the edge
  off the tick rate. Worth revisiting if movement ever feels laggy on a
  busier LAN.

## Known gaps in this pass

- No touch/mobile controls — pointer lock + WASD assumes a desktop browser
  with a mouse and keyboard.
- No client-side position prediction/reconciliation, just smoothing (see
  above) — fine on a home LAN, may need revisiting under real latency.
- Footstep audio has been play-tested: self footsteps and approaching-player
  direction/distance both sound correct. Ambient locations and tuning remain
  adjustable in `src/shared/sounds.js` as play-testing continues.
- `public/sfx/footsteps.wav` was supplied by the user, not generated —
  worth knowing if this project is ever shared or open-sourced, since its
  actual copyright/license status wasn't verified here.

## Roadmap (post-v01)

- Multi-level play with stairs up/down and per-level fog-of-war (server side
  already tracks stairs; client doesn't use them to change level yet).
- Persistent player identity across reconnects.
- Balance pass on cache boon ranges, weapon/spell stats.
- Mobile/touch controls for participants.
- DM view: pan/zoom and multi-level switching once dungeons exceed 1 level.
