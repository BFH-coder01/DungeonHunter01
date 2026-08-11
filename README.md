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

- Move: WASD / arrow keys, relative to where you're looking
- Look: mouse (click the view to capture the pointer; Esc releases it)
- Attack (equipped weapon): left click
- Cast (equipped spell): right click / space
- Pick up: E
- Inventory: click a slot to equip it, right-click a slot to drop it. Number
  keys 1–8 also equip a slot.

The DungeonMaster view has no controls — it's a read-only overview. Just open
`/dm.html` and watch.

## Architecture notes

- The server is authoritative for everything — position, combat, inventory.
  Clients only ever send movement intent (`mx`, `my`, view angle) and
  discrete actions (attack/cast/pickup/drop/equip); they never assert state.
- The first-person renderer is a classic grid-DDA raycaster (Wolfenstein-style)
  drawn as sparse, gapped vertical strokes rather than a filled render — a
  deliberate "vector wireframe" look rather than a solid 3D fake-out. Distance
  fog fades out at the dungeon's sight radius; N/S vs E/W wall faces are
  shaded differently so corners and corridors stay legible.
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

## Roadmap (post-v01)

- Multi-level play with stairs up/down and per-level fog-of-war (server side
  already tracks stairs; client doesn't use them to change level yet).
- Persistent player identity across reconnects.
- Balance pass on cache boon ranges, weapon/spell stats.
- Mobile/touch controls for participants.
- DM view: pan/zoom and multi-level switching once dungeons exceed 1 level.
