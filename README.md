# DungeonHunter01

Browser-based, procedurally generated dungeon crawler for play over the home
wifi. One machine runs the server; everyone else joins from a browser on the
same network. No installs, no accounts — just a URL.

## v01 scope

- Procedural dungeon: random 1–10 levels (rooms + corridors), random weapon
  caches, random player spawn points.
- Players join from a browser, get assigned a random spawn point; on death
  they respawn at a different random spawn point.
- Per-player HUD with fog-of-war — only the parts of the dungeon a player has
  explored are drawn for them.
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
real multi-level / fog-of-war behaviour.

## Running it

```bash
npm install
npm start
```

The server prints a LAN URL (e.g. `http://192.168.1.23:8080`) — open that on
any device on the same wifi to join. `npm run dev` restarts on file changes.

## Layout

```
src/
  shared/     constants, config, RNG, item tables — used by server AND client
  server/     authoritative simulation: dungeon generation, game state, ws/http server
public/       browser client (plain HTML/CSS/JS, canvas wireframe renderer, no build step)
```

The client fetches shared code straight from `/shared/*` — server and browser
run the exact same constants/config/item definitions, so there's no
duplication to drift out of sync.

## Controls (test build)

- Move: WASD / arrow keys
- Aim: mouse
- Attack (equipped weapon): left click
- Cast (equipped spell): right click / space
- Pick up: E
- Inventory: click a slot to equip it, right-click a slot to drop it. Number
  keys 1–8 also equip a slot.

## Roadmap (post-v01)

- Multi-level play with stairs up/down and per-level fog-of-war.
- Persistent player identity across reconnects.
- Balance pass on cache boon ranges, weapon/spell stats.
- Spectator / lobby screen, match reset without restarting the server.
