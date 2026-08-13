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
- Inventory is a fixed eight-slot loadout: slots 1–4 map to the left hand and
  5–8 to the right. Z/M (and matching mouse buttons) activate
  those hands. Number keys toggle equipment; drag-and-drop swaps slot sides.
- A shield hand dodges. With two weapons, the right hand is primary/full
  damage and the left is off-hand/half damage; a lone left weapon is full.

### DungeonMaster UI

- Full-level overview with no fog and a collapsible live Game Settings panel.
- Shows every player, player name/health, cache, drop, movement/noise range,
  and all ambient sound points.
- Spectators may send range-validated `MSG.DM_SETTINGS` updates for stamina,
  movement, boon, chest, and battle-portal timing. The server broadcasts the
  resulting `MSG.SETTINGS` state so player prediction stays synchronized.
- `MSG.SPECTATE` and DM settings are currently trusted-LAN access with no
  authentication; this is intentional for the test environment.

### Audio

- Footsteps are intentionally unchanged: the local player is quiet/centered;
  other moving players use position panners and become louder on approach.
- Ambient sources are authoritative seeded dungeon entities generated in
  `src/server/dungeon.js`, never random client-local points.
- Sound catalogue and tuning are centralized in `src/shared/sounds.js`:
  `ambientPointCount`, `AMBIENT_POINT_MIN`, `AMBIENT_BASE_AREA`,
  `AMBIENT_MAX_DIST`, `AMBIENT_REF_DIST`, and
  `AMBIENT_GAIN`.
- Current ambient tuning: 45 points on 192×132, 22-tile maximum distance, 1.5-tile
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

Dungeon corridor density is controlled by `extraCorridorsPerRoom` and
`corridorNeighborChoices`. Extra links must remain unique and seeded; retain
the nearest-room spanning tree so all rooms stay connected without long
cross-map cuts, even when local loop density is retuned.

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

The first fight-mechanics slice resolved two earlier correctness defects:
events are cleared only after snapshot fan-out, and full-inventory pickups no
longer consume caches or floor drops.

Current weapon/hand foundation:

- Fixed nullable inventory slots preserve left/right loadout position.
- Equipment number keys toggle the item assigned to that slot's hand.
- Server-authoritative slot swapping supports drag-to-rearrange loadouts.
- Weapon attacks create an authoritative windup/release state; damage resolves
  after the windup, not on keydown. Axe cleave can hit multiple targets and
  maul applies knockback.
- Shields are cache items (at least one is guaranteed per level). Activating a
  shield hand performs a directional dash with brief invulnerability.
- First-person weapons animate by attack style, and opponent weapons turn
  amber during their telegraphed windup.
- Weapon attacks, shield dodges, spell casts, and successful movement cycles
  spend authoritative stamina. Movement always uses `movementSpeedScale` and
  drains `movementStaminaPerSec`; zero stamina prevents movement. Regeneration
  starts only after movement intent is released for `staminaRegenDelayMs`.
  Never base drain on OS keyboard-repeat events—the client sends state and the
  server owns cycle timing.
- Only one attack, cast, dodge, or swap may be active; follow-up key presses are
  rejected rather than queued. Weapons apply individual movement scales during
  wind-up and recovery, and WebSocket token buckets protect against flooding.
- Every level has a seeded-random red battle portal and a large battle destination
  room. One player crossing it gathers all living players into spread arena
  positions, cancels active actions, and starts a 20-second retrigger cooldown;
  normal room exits remain available for retreat.
- Green, blue, and yellow portals each form a distant bidirectional pair. A
  per-player arrival lock prevents immediate bounce-back and clears only after
  the player steps out of the destination portal.

Preserve these gameplay decisions unless the user changes them:

- Players send movement/aim/action intent; the server decides hits and damage.
- Death drops carried inventory and respawns the player at another suitable
  spawn point.
- Alive opponents have no player-view name/health overlay; killed opponents
  briefly reveal their name.
- The DM continues to see complete combat state.

Spell/projectile foundation:

- Space starts an authoritative cast windup rendered as sparkles converging on
  the caster. Mend resolves after windup; offensive spells launch projectiles.
- Projectiles move in server tick substeps, lose damage energy with distance,
  and collide with walls, unopened caches, and players. Frost slows only on a
  non-dodged hit; Ember applies radial damage at a player impact.
- Throwing Knives are hand equipment with a throw windup. They use the same
  projectile engine and land as the original inventory item after impact or
  range expiry, allowing any player to pick them up and reuse them.
- Melee weapons lose durability only when a resolved swing contacts a player
  or wall. Throwing knives wear only on player/wall projectile impact; misses,
  range expiry, and cache collisions do not count. Shields wear on each dodge.
  Spells have a finite cast count, consumed whenever the cast resolves, whether
  or not an offensive projectile later hits. Equipment and spells do not
  expire while idle; only qualifying wear and completed casts consume them.
- Boons are temporary server-owned effects. Their two-minute timer is visible
  in the HUD, and the affected attribute is recalculated when each effect ends.
- Every cache reward records its source cache. When that exact reward breaks,
  exhausts, a boon expires, or a reward leaves with a disconnected player, the cache waits a
  randomized delay, relocates to another valid separated floor tile, and rolls
  a fresh item. Keep completion idempotent via the outstanding reward UID.
- Boon/cache lifecycle tuning belongs in `CONFIG.rewards`; per-item durability and cast
  counts belong in `src/shared/items.js`. Do not reset lifecycle fields during
  pickup or drop operations.

## Deferred scope

- Strict walked-tile visibility and real multi-level traversal are post-v01;
  stairs are generated but the client does not transition levels yet.
- DM authentication, live sound-tuning controls, mobile controls, persistent
  identity, and client position prediction are not implemented.
- Do not expand into these areas during fight-dynamics work unless requested.
