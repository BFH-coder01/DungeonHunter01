# DungeonHunter01 architecture

This document describes the current v0.1 runtime and its known boundaries.

## Purpose and status

DungeonHunter01 v0.1 is a zero-build, trusted-LAN multiplayer dungeon proof of
concept. A single Node.js process serves the browser application, accepts
WebSocket connections, owns the game simulation, and generates a seeded
dungeon in memory.

The design deliberately separates two clients:

- The **player UI** is a first-person participant with a filtered game-state
  snapshot and a personal exploration map.
- The **DungeonMaster UI** is a read-only spectator with the complete map,
  cache, sound-point, projectile, and player state for the current v0.1 level.

## Runtime topology

Player and DungeonMaster browsers fetch static modules from the Node HTTP
server and use WebSockets on the same host and port. The gateway passes player
input and actions into the authoritative `Game`, which owns the dungeon,
players, projectiles, and snapshots.

There is no reverse proxy, database, asset pipeline, or frontend framework.
HTTP and WebSocket traffic default to port 8080.

## Source responsibilities

- `src/server/index.js`: static HTTP routing, WebSocket lifecycle, 20 Hz tick
  scheduling, and snapshot fan-out.
- `src/server/game.js`: authoritative movement, vision, inventory, combat,
  projectiles, pickups, deaths, respawns, events, and role-specific snapshots.
- `src/server/dungeon.js`: seeded rooms, corridors, spawns, caches, shields,
  stairs, and ambient points.
- `src/shared/constants.js`: dependency-free protocol, tile, physics, vision,
  and timing constants used by server and browsers.
- `src/shared/config.js`, `items.js`, and `rng.js`: server simulation tuning,
  item definitions, and deterministic generation.
- `src/shared/sounds.js`: ambient catalogue and spatial tuning shared by
  generation, snapshot filtering, and browser playback.
- `public/client.js` and `audio.js`: player protocol, input, HUD/loadout,
  raycaster, combat rendering, minimap, and spatial audio.
- `public/dm.js`: complete schematic dungeon and all-player spectator view.

## Process lifecycle

1. `src/server/index.js` creates one `Game` instance.
2. `Game` chooses a seed and generates all configured levels, caches, spawns,
   stairs, and sound points.
3. HTTP exposes `public/` and selected ES modules from `src/shared/`.
4. Each WebSocket becomes exactly one player (`join`) or read-only
   DungeonMaster (`spectate`).
5. Every 50 ms the server advances the game, sends a tailored snapshot to each
   connection, and then clears delivered events.

All state is in memory. Restarting creates a new game and disconnects players.

## Protocol and authority

Clients send `join`, `spectate`, movement `input`, and discrete `action`
messages. Actions cover attacking, casting, pickup/drop, equip, and slot moves.
The server clamps movement input and validates inventory ownership, timing,
range, collision, mana, cooldowns, damage, and resulting state.

The server sends `welcome` metadata and 20 Hz role-specific `state` snapshots.
The browser never asserts position, health, damage, inventory, cache state,
projectile hits, or kills. Mouse-look is predicted locally for responsiveness;
the stored aim and every gameplay consequence remain authoritative on server.

## Visibility and DungeonMaster separation

The product contract is that a player must not receive dungeon or entity data
outside that player's own exploration history. The DM must see the full dungeon
and every operational marker and player.

With `CONFIG.revealAll: false`, the server keeps per-player `visible` and
`explored` sets using sight-radius and line-of-sight checks. Player snapshots
filter other players and projectiles through current visibility, and caches and
ground drops through exploration history.

The v0.1 PoC intentionally ships with `CONFIG.revealAll: true`. On spawn every
tile enters the player's explored set and entity visibility is unrestricted.
This is test scaffolding, not the final privacy policy.

Strict walked-tile-only visibility is not implemented yet: non-PoC mode reveals
line-of-sight tiles around the path, not only tiles physically entered. That
distinction must be resolved before the final visibility contract is complete.

Living-opponent names and health are deliberately not rendered by the player
UI, but those fields are still present in current snapshots for visible
opponents. Remove them server-side if metadata secrecy becomes part of the
authority boundary rather than only a presentation rule.

The separate `spectate` path creates no character. DM welcome data contains the
complete tile array and all sound points; subsequent snapshots contain all
players with identity/health, caches, drops, and projectiles on that level.

## Dungeon generation

Generation is deterministic for a game seed. Rooms are carved and connected;
then spread-out spawns, caches, ambient points, and optional stairs are placed.
Cache contents come from shared item tables, and every generated level is
guaranteed at least one shield. Ambient-point count scales with map dimensions
(12 minimum, 36 on the current 192×132 test map); farthest-point placement
keeps coverage even, and each receives one to three seeded clips.

`src/shared/config.js` currently fixes generation to one level. Random 1–10
level generation exists, but travel between levels remains deferred.

## Inventory and combat

Each player has eight fixed nullable slots. Slots 1–4 belong to the left hand
(Z or left click); slots 5–8 belong to the right hand (M or right-click). Space
casts the independently prepared spell. Moving equipped items across the
loadout updates their hand and safely resolves equipment conflicts.

Two weapons make the left weapon an off-hand attack at half damage; a lone left
weapon deals full damage. Server-timed attacks have windup, release, and
recovery. Shields perform a collision-checked directional dash with brief
invulnerability and cooldown. Spell selection is immediate, but casting has a
visible windup.

Weapon attacks and shield dodges consume server-owned stamina. Regeneration
starts only after a short delay and after the active combat action has ended.
Combat actions are mutually exclusive with no queued follow-up action. Weapon
definitions provide separate wind-up and recovery movement scales, while spell
wind-up uses a shared movement scale. Per-connection token buckets bound total,
movement, and action WebSocket message rates before intent reaches the game.

Generation designates the largest room as a battle destination and places a
red battle portal at a seeded random valid floor tile outside the arena and
central map zone. Crossing
its authoritative radius moves
all living players on the level to spread, collision-safe positions inside the
battle room, cancels actions already in progress, and starts a 20-second portal
cooldown. The room remains part of the normal corridor graph, allowing retreat.

Generation also creates green, blue, and yellow one-to-one link pairs. Each
pair occupies two widely separated non-arena rooms. Link traversal is
server-authoritative and bidirectional; the arrival endpoint remains locked
for that player until they step outside its radius, preventing tick-to-tick
ping-pong while preserving deliberate return travel.
Portal coordinates intentionally bypass exploration filtering: they are global
navigation landmarks. The player client clamps off-minimap portals to its map
edge and allows nearby supernatural portal glow to render through walls.

Offensive spells and throwing knives share a server projectile engine with
straight-line substeps, energy loss over distance, and wall, unopened-cache,
and player collision. Spell effects include slow and splash damage. A throwing
knife becomes a recoverable floor item when its travel ends.

Death drops inventory, updates kills/deaths, exposes the defeated player's name
on the fallen avatar, and schedules a three-second respawn. Living opponents
remain unlabeled hooded hunters in the player UI.

### Planned reward lifecycle

Equipment durability, spell lifetimes, and cache regeneration are planned but
not yet implemented. The server will remain authoritative for every lifecycle
transition. Equipment will wear down through use, spells will cease to be
available when their configured lifetime is complete, and the reward will then
leave its owner's inventory.

Each generated reward will retain an association with the cache that supplied
it. Once that reward's lifecycle completes, the cache becomes eligible to
regenerate at a different seeded-valid random floor location rather than
remaining permanently exhausted. Placement must use the dungeon's existing
collision and reachability constraints. The design goal is circulation: scarce
equipment and spells repeatedly return to play so one player cannot permanently
deny everyone else access by hoarding them.

Before implementation, balance decisions still required include the durability
unit for each equipment class, whether spell lifetime is measured by time or
uses, cache regeneration delay, and how dropped or transferred rewards retain
their source association. These are tuning decisions; authoritative expiry,
inventory removal, and relocated cache regeneration are the required behavior.

## Rendering and audio

The player Canvas uses a grid-DDA raycaster with procedural wall, floor, and
ceiling textures. Billboard layers render hunters, caches, drops, projectiles,
and spell effects. The minimap uses only tile data supplied for that player.
The DM Canvas is schematic and intentionally renders complete operational state.

Web Audio provides centered self footsteps, positioned footsteps for moving
players, and fixed seeded ambient sources. The server sends a player only nearby
ambient points; the DM receives them all. `PannerNode` direction and distance
use the same smoothed camera position and angle as rendering. Playback begins
from the join gesture to satisfy browser autoplay rules.

## Configuration and dependencies

- Node.js 20+ is required.
- `package-lock.json` locks the `ws` dependency; deployments use `npm ci`.
- There are no Python packages; `requirements.txt` is compatibility metadata.
- `PORT` is the only environment variable read and defaults to 8080.
- Gameplay, dungeon, visibility, and audio tuning live in shared source modules
  and require a server restart after changes.

## Security and persistence constraints

The current trust boundary is a home LAN. There is no authentication, TLS,
database, or persistent game identity/state. Player and spectator protocol paths
are separated, but that is not access control. Do not expose the Node server
directly to the public internet. Audio licensing also requires verification
before public distribution.

## Testing and evolution

Verification includes the automated `npm test` server/gameplay regression
suite, syntax checks, targeted simulation/protocol probes, and manual two-window
or multi-device gameplay checks.

Near-term architectural work includes final strict visibility semantics,
multi-level traversal, reconnect identity, mobile controls, combat balance,
reward lifecycles, and broader server/protocol tests.
