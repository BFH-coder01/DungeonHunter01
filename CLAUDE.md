# Claude Code guide — DungeonHunter01

## Working agreement

- Do not develop directly on `main`. Create/use a feature branch and leave it
  available for browser play-testing before merge.
- Preserve existing staged and unstaged work. Inspect `git status` and the
  relevant diff before editing; do not reset or discard unrelated changes.
- Do not commit, merge, or push until the user asks after testing.
- Keep the zero-build browser architecture: native ES modules, Canvas/Web
  Audio, Node HTTP, and `ws`. Shared browser/server modules live in
  `src/shared/` and are served at `/shared/*`.
- The server is authoritative. Browser messages express intent only; never
  accept client-supplied position, health, damage, inventory, or visibility.

## Run and verify

```bash
npm install
npm start
```

- Player UI: `http://localhost:8080/`
- DungeonMaster UI: `http://localhost:8080/dm.html`
- `npm run dev` uses Node watch mode.
- The repository currently has no automated `test` script. At minimum run
  `node --check` on changed JavaScript, `git diff --check`, and focused
  in-memory `Game` simulations for server behavior.
- A server launched in the background remains a separate `node.exe` after an
  agent exits. Check the listener PID before restarting; do not silently move
  between ports. Port 8080 is the canonical test port.

## Current v01 contract

### Player UI

- First-person Canvas raycaster with server-position smoothing and locally
  predicted view angle.
- Alive opponents render as unlabeled hooded hunters. Do not show their name
  or health in the player view.
- A visible killed opponent remains as a fallen avatar during the respawn
  window; only then is their name displayed.
- The minimap and world entities must not expose information outside the
  player's allowed exploration state. For the v01 proof of concept,
  `CONFIG.revealAll` is intentionally `true`; this is test scaffolding, not the
  final visibility policy.

### DungeonMaster UI

- Read-only full-level overview with no fog.
- Shows every player, player name/health, cache, drop, movement/noise range,
  and all ambient sound points.
- `MSG.SPECTATE` is currently trusted-LAN access with no authentication.

### Audio

- Footsteps are intentionally unchanged: the local player is quiet/centered;
  other moving players use position panners and become louder on approach.
- Ambient sources are authoritative seeded dungeon entities generated in
  `src/server/dungeon.js`, never random client-local points.
- Sound catalogue and tuning are centralized in `src/shared/sounds.js`:
  `AMBIENT_POINT_COUNT`, `AMBIENT_MAX_DIST`, `AMBIENT_REF_DIST`, and
  `AMBIENT_GAIN`.
- Current ambient tuning: 12 points, 10-tile maximum distance, 1.5-tile
  reference distance, and 0.30 ambient-only gain. Do not change footstep
  volume when tuning ambience.
- Players receive authoritative points as they approach audible range. The DM
  receives every point in `dmWelcome` and renders cyan radiating markers.

## Code map

- `src/server/index.js` — static HTTP server, WebSocket connections, tick and
  snapshot fan-out.
- `src/server/game.js` — players, movement, visibility, combat, inventory,
  death/respawn, player and DM protocol payloads.
- `src/server/dungeon.js` — seeded rooms/corridors, spawn points, caches,
  stairs, and ambient sound-point generation.
- `src/shared/config.js` — v01 gameplay/dungeon tuning and test flags.
- `src/shared/constants.js` — protocol/action constants and physical limits.
- `src/shared/items.js` — weapons, spells, boons, cache rolls.
- `src/shared/sounds.js` — ambient catalogue and spatial tuning.
- `public/client.js` — player protocol, controls, HUD/inventory, raycaster,
  billboards, hooded/downed avatar rendering.
- `public/audio.js` — footstep loops, ambient scheduling, listener and panners.
- `public/dm.js` — complete schematic dungeon/player/cache/sound overview.

## Fight-dynamics starting point

Combat is server-authoritative in `src/server/game.js`:

- `handleAction` dispatches attack, cast, pickup, drop, and equip.
- `doAttack` uses equipped weapon range, forward-dot targeting, cooldown, and
  line of sight.
- `doCast` handles mana/cooldown, self-heal spells, and ranged targeting.
- `damage` owns health reduction, kill/death counts, inventory drops, and the
  three-second respawn timer.
- Weapon swaps deliberately root the player for `weaponSwapMs`; spell changes
  are immediate.

Resolve these known correctness issues while working on fight dynamics:

1. `Game.tick()` clears `this.events` before the server sends snapshots.
   Action/combat/pickup/death events emitted between ticks can be discarded,
   so move event clearing until after snapshot fan-out or use per-client queues.
2. `doPickup()` marks a cache looted or removes a floor drop before
   `giveItem()` checks inventory capacity. A full inventory therefore destroys
   non-boon items. Validate capacity before mutating the world entity.

Preserve these gameplay decisions unless the user changes them:

- Players send movement/aim/action intent; the server decides hits and damage.
- Death drops carried inventory and respawns the player at another suitable
  spawn point.
- Alive opponents have no player-view name/health overlay; killed opponents
  briefly reveal their name.
- The DM continues to see complete combat state.

## Deferred scope

- Strict walked-tile visibility and real multi-level traversal are post-v01;
  stairs are generated but the client does not transition levels yet.
- DM authentication, live sound-tuning controls, mobile controls, persistent
  identity, and client position prediction are not implemented.
- Do not expand into these areas during fight-dynamics work unless requested.
