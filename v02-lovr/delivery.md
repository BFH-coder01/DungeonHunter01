# DungeonHunter v02 — Delivery Packets

Dispatch document for an orchestrating agent handing work to executing
agents. **Each packet below is self-contained** — an executing agent should
be able to complete its packet from the packet alone, without opening
`design.md`. (`design.md` still exists as the canonical design reference and
rationale document; `roadmap.md` still holds the sequencing overview and
dependency graph. This file exists so dispatch doesn't require stitching
those two together per item.)

Every packet follows **precondition → process → postcondition**, and every
postcondition is an automated, checkable acceptance test.

---

## D0 — Test harness + docs

- **Preconditions**: repo has the `v02-lovr/` scaffold — `README.md`,
  `server/conf.lua`, `server/main.lua` (stub), `client/conf.lua`,
  `client/main.lua` (stub), `shared/protocol.lua` (constants only so far, no
  encode/decode yet).
- **Process**:
  1. Add a `v02-lovr/spec/` directory and a `busted`
     ([lunarmodules/busted](https://github.com/lunarmodules/busted)) config
     (`.busted` at `v02-lovr/` root, pointing at `spec/`).
  2. Add `v02-lovr/test.sh`: a shell script that runs `busted spec` from
     `v02-lovr/`, exits non-zero on any failure.
  3. Confirm it works with plain `lua`/`luajit`/`busted` — **no LÖVR
     runtime**, since pure units never call `lovr.*` or `enet`.
- **Postconditions** (acceptance test): `./v02-lovr/test.sh` exits 0 with
  zero spec files present (empty-suite pass), and exits non-zero if a
  deliberately-broken spec file is added (sanity-check the harness actually
  fails on failure, then remove the sanity file).
- **Owner / access needed**: any agent; no LÖVR install, no network, no
  hardware.
- **Depends on**: nothing.
- **Blocks**: D1, D2, D3, D4, D5 (all need the harness to prove their spec
  passes).

---

## D1 — Protocol contracts

- **Preconditions**: D0 merged (test harness exists). `shared/protocol.lua`
  already defines:
  ```lua
  protocol.CHANNEL = { STATE = 0, EVENT = 1, INTENT = 2 }
  protocol.MSG = { HELLO = "hello", INTENT = "intent", WELCOME = "welcome",
                    SNAPSHOT = "snapshot", EVENT = "event" }
  ```
- **Process**:
  1. Define concrete payload shapes for each `MSG` value (fields, types,
     bounds) — e.g. `INTENT` needs a tick/sequence number, movement
     direction, aim, and an action enum; `SNAPSHOT` needs a tick number and
     a list of visible entity states; `EVENT` needs an event-type tag and
     type-specific fields (damage amount, item id, etc.). Choose a compact
     binary encoding (not JSON — this is UDP, keep payloads small).
  2. Implement `protocol.encode(msgType, payload)` returning a byte
     string, and `protocol.decode(bytes)` returning `(msgType, payload)` or
     an explicit error value — **never a Lua error/crash on malformed
     input**, since this function will receive untrusted bytes straight off
     the network in D6.
  3. Add `protocol.lua` functions to the existing module table in
     `shared/protocol.lua` (don't create a second file).
- **Postconditions** (acceptance tests, in `spec/protocol_spec.lua`):
  - `decode(encode(t, p))` round-trips to an equivalent `(t, p)` for every
    defined `MSG` value.
  - Truncated/garbage bytes passed to `decode` return the explicit error
    value, not a thrown error.
  - An oversized payload (define and enforce a max size) is rejected by
    `encode` before it would produce an oversized packet.
- **Owner / access needed**: any agent; no LÖVR/hardware.
- **Depends on**: D0.
- **Blocks**: D6, D7.

---

## D2 — Dungeon generation

- **Preconditions**: D0 merged. Port target: `src/server/dungeon.js` (v01)
  and `src/shared/config.js` dungeon tuning fields (room/corridor counts and
  bounds, spawn point count, cache count, stair placement rules).
- **Process**:
  1. Create `server/dungeon.lua` exporting `generate(seed, params)`.
  2. `seed` is an integer, `params` is a table mirroring the v01 config
     fields used by `src/server/dungeon.js`.
  3. Implementation must be **deterministic**: same `seed` + same `params`
     → bit-identical output, every call. Use an explicit seeded PRNG state
     threaded through the function, not any global/ambient random state.
  4. Output a `DungeonMap` table containing: rooms, corridors, spawn
     points, cache locations, stair location(s), ambient sound points
     (mirrors v01's `src/server/dungeon.js` ambient-point generation).
- **Postconditions** (acceptance tests, in `spec/dungeon_spec.lua`):
  - Two calls with identical `(seed, params)` produce identical output
    (deep-equal).
  - Different `seed` with identical `params` produces different output.
  - Every spawn point is reachable from every other spawn point through
    generated corridors/rooms (no isolated pockets).
  - No two generated geometry pieces overlap.
  - Cache count and stair count match what `params` requested.
- **Owner / access needed**: any agent; no LÖVR/hardware.
- **Depends on**: D0.
- **Blocks**: D6.

---

## D3 — Movement + collision

- **Preconditions**: D0 merged.
- **Process**:
  1. Create `server/movement.lua` exporting
     `validate(dungeon, entity, intent, dt)`.
  2. `entity.pos` is the last-known-good **authoritative** position (never
     trust a position embedded in `intent` — `intent` is client-submitted
     and untrusted, direction/speed only).
  3. `dt` is the server tick interval (seconds).
  4. Integrate `intent`'s direction against `entity.pos`, clamped to
     `entity.maxSpeed * dt` maximum displacement this call.
  5. Resolve collision against `dungeon` geometry (the `DungeonMap` shape
     from D2 — coordinate with D2's owner on the exact table shape, or stub
     a minimal geometry table if D2 isn't merged yet and this must run in
     parallel).
  6. Malformed `intent` (NaN, infinite, or absurdly large magnitude) must
     degrade to "no movement" (return `entity.pos` unchanged), never throw
     or produce a NaN/teleported position.
- **Postconditions** (acceptance tests, in `spec/movement_spec.lua`):
  - A legal in-bounds move within `maxSpeed * dt` is accepted as given.
  - A move requesting more than `maxSpeed * dt` displacement is clamped to
    the max, not rejected outright.
  - A move whose path intersects solid dungeon geometry is rejected
    (position unchanged, or stopped at the collision boundary).
  - `intent` containing NaN or an extreme magnitude value leaves
    `entity.pos` unchanged and does not error.
- **Owner / access needed**: any agent; no LÖVR/hardware.
- **Depends on**: D0. (May stub dungeon geometry rather than block on D2.)
- **Blocks**: D6, D7.

---

## D4 — Combat + damage + inventory

- **Preconditions**: D0 merged. Reference for parity: `src/server/game.js`
  `doAttack`, `doCast`, `damage`, `doPickup` (v01), and the two known v01
  bugs this packet must design out rather than replicate:
  1. v01 `Game.tick()` clears its event list before snapshot fan-out,
     dropping events between ticks (this packet is not responsible for the
     fix — that's D6's event-queue-drain design — but must emit its
     events through a return value, not a side-effect write to a shared
     list, so D6 can drain it correctly).
  2. v01 `doPickup()` marks a cache looted / removes a floor drop **before**
     checking inventory capacity, destroying non-boon items on a full
     inventory. This packet's `inventory.pickup` must check capacity
     **before** signaling the world item should be consumed.
- **Process**:
  1. Create `server/combat.lua` exporting:
     - `resolveAttack(attacker, target, weapon, hasLineOfSight)` — checks
       weapon range, forward-dot targeting, cooldown elapsed, and the
       caller-supplied `hasLineOfSight` boolean (line-of-sight raycasting
       against dungeon geometry is the orchestrator's job in D6, kept out
       of this pure unit so it's testable without geometry fixtures).
       Returns `{ hit = bool, reason = string }`, no mutation of either
       entity.
     - `applyDamage(entity, amount)` — reduces health by `amount`, clamps
       at zero, returns `{ entity = <new state>, died = bool, drops =
       <list> }`. On lethal damage, `drops` is the entity's carried
       inventory (mirrors v01 "death drops carried inventory"); this
       function does not place drops in the world — that's D6's job.
  2. Create `server/inventory.lua` exporting `pickup(entity, item,
     capacity)` — checks `capacity` against `entity.inventory` **first**,
     returns `{ accepted = bool, entity = <new state or unchanged> }`.
     Only when `accepted == true` may the caller (D6) mark the world item
     consumed. This ordering is the known-issue-#2 fix — get it right here,
     not as a patch later.
- **Postconditions** (acceptance tests, in `spec/combat_spec.lua` and
  `spec/inventory_spec.lua`):
  - `resolveAttack`: in-range hit succeeds; out-of-range rejected; attack
    before cooldown elapsed rejected; `hasLineOfSight = false` rejected;
    none of these mutate `attacker`/`target`.
  - `applyDamage`: non-lethal damage leaves entity alive with health
    clamped ≥ 0; lethal damage returns `died = true` and the correct drop
    list.
  - `pickup`: item into free inventory slot is accepted; item against a
    full inventory is rejected with `accepted = false` (and by contract the
    caller must leave the world item untouched — assert this at the D6
    integration level, not just here).
- **Owner / access needed**: any agent; no LÖVR/hardware.
- **Depends on**: D0.
- **Blocks**: D6.

---

## D5 — Interest management + respawn

- **Preconditions**: D0 merged. Reference for parity: `src/server/game.js`
  visibility/respawn logic and the repo `CLAUDE.md` v01-contract rules:
  alive opponents get no name/health overlay in the player view; a killed
  opponent's fallen avatar reveals their name only during the respawn
  window; the DM/spectator role sees complete, unfiltered state
  (`MSG.SPECTATE`); three-second respawn timer; respawn picks "another
  suitable spawn point."
- **Process**:
  1. Create `server/interest.lua` exporting
     `filterSnapshotForPlayer(worldState, player, visibilityRules)` —
     produces the subset of `worldState` that `player` is allowed to
     receive. This is the enforcement point: v01 relied on the client not
     *rendering* hidden data; this unit makes the server not *send* it.
     `visibilityRules` must encode: alive-opponent fields stripped of
     name/health; downed-opponent fields include name only while within the
     respawn window; a DM-role `player` receives `worldState` unfiltered.
  2. Create `server/respawn.lua` exporting:
     - `scheduleRespawn(deathTick, respawnDelayTicks)` — returns a tick
       number strictly greater than `deathTick`.
     - `selectRespawnPoint(dungeon, occupied)` — returns a spawn point from
       `dungeon`'s spawn list not in the `occupied` set; if all points are
       occupied, falls back to the least-recently-occupied one rather than
       erroring.
- **Postconditions** (acceptance tests, in `spec/interest_spec.lua` and
  `spec/respawn_spec.lua`):
  - Filtered output for a normal player never contains an alive opponent's
    name or health field.
  - Filtered output contains a downed opponent's name only while the
    simulated respawn window hasn't elapsed, and not after.
  - Filtered output for a DM-role player exactly equals the unfiltered
    `worldState` (deep-equal).
  - Filtering an already-filtered view is a no-op (idempotent).
  - `scheduleRespawn` returns a tick after `deathTick` by the configured
    delay.
  - `selectRespawnPoint` never returns a point present in `occupied`, and
    degrades gracefully (no error) when `occupied` covers every point.
- **Owner / access needed**: any agent; no LÖVR/hardware.
- **Depends on**: D0.
- **Blocks**: D6.

---

## D6 — Server orchestrator + ENet shell

- **Preconditions**: D1 (protocol), D2 (dungeon), D3 (movement), D4
  (combat/inventory), D5 (interest/respawn) all merged. This is the
  integration point — nothing here is a pure unit.
- **Process**:
  1. Rewrite `server/main.lua`'s `TODO`s so each server tick, in this
     order: drain received `INTENT` messages per connected peer → call
     `movement.validate` → call `combat.resolveAttack` /
     `combat.applyDamage` for any attack/cast intents → call
     `inventory.pickup` for pickup intents (only consuming the world item
     when `accepted == true`) → call `respawn.scheduleRespawn` /
     `selectRespawnPoint` bookkeeping for any deaths this tick → call
     `interest.filterSnapshotForPlayer` once per connected player → call
     `protocol.encode` on the result → send over ENet
     (`protocol.CHANNEL.STATE` for snapshots, `protocol.CHANNEL.EVENT` for
     discrete events).
  2. **Event-ordering fix (v01 known-issue #1)**: do not maintain a
     separate mutable event list that gets cleared on a schedule. Instead,
     have each tick's event-producing calls (combat, pickup, death) return
     their events directly into the same pass that builds
     `filterSnapshotForPlayer`'s output, so there is no "clear" step that
     can run before a snapshot referencing those events is sent. Verify by
     asserting in the integration test that an event produced on tick N is
     present in the snapshot sent for tick N, for two consecutive ticks in
     a row (catches the exact v01 regression).
  3. ENet connect/disconnect handling: on disconnect mid-game, treat as a
     death (drop inventory per v01 semantics) and free the player's spawn
     slot.
- **Postconditions** (acceptance test — scripted-peer integration test,
  **requires a real LÖVR runtime**, not `busted` alone): drive the server
  with fake ENet peers sending a known `INTENT` sequence across several
  ticks; assert the resulting `STATE`/`EVENT` byte output matches expected
  values for: a normal move, an attack landing, an attack missing (out of
  range), a pickup with room in inventory, a pickup attempted against a
  full inventory (world item must remain, per D4's contract), a death and
  respawn-tick scheduling, and the two-consecutive-ticks event-ordering
  check from step 2.
- **Owner / access needed**: agent with LÖVR runtime installed. **Not
  runnable in a sandbox without LÖVR** — flag this explicitly rather than
  claiming it passes.
- **Depends on**: D1, D2, D3, D4, D5.
- **Blocks**: D7, D8.

---

## D7 — Client prediction + reconciliation

- **Preconditions**: D1 (protocol, for decoding `SNAPSHOT`), D3 (movement,
  for shared integration math), D6 (a server to connect to) all merged.
- **Process**:
  1. Create `client/prediction.lua` exporting `predictMovement(localState,
     intent, dt)`. Must use the **same integration math** as
     `server/movement.lua`'s displacement calculation (share the arithmetic
     via a common helper, don't reimplement it independently — divergence
     here is what causes visible rubber-banding).
  2. Create `client/reconciliation.lua` exporting `reconcile(predictedState,
     serverSnapshot)` — when `serverSnapshot` agrees with `predictedState`,
     output equals `predictedState` unchanged (no jitter). When it diverges,
     correct toward the server value while replaying any local input newer
     than the snapshot's tick.
  3. Wire `client/main.lua`'s remaining `TODO`s: sample input each frame,
     call `prediction.lua`, send `protocol.MSG.INTENT` on
     `protocol.CHANNEL.INTENT`, decode incoming `SNAPSHOT`/`EVENT` messages,
     call `reconciliation.lua`. Replace the placeholder plane draw with
     real geometry once dungeon data is flowing from the server.
- **Postconditions** (acceptance tests):
  - `busted` (`spec/prediction_spec.lua`, `spec/reconciliation_spec.lua`):
    given fixed `(localState, intent, dt)`, `predictMovement`'s
    displacement matches `movement.validate`'s displacement for the same
    inputs (cross-checked against the D3 unit, not just internally
    consistent); `reconcile` is a no-op when snapshot matches prediction,
    and converges toward the server value on divergence without discarding
    unacknowledged newer input.
  - Manual play-test against a running D6 server, confirming movement feels
    responsive over a real LAN connection (not just passing unit tests).
    **This step requires a human with the LÖVR client installed and cannot
    be completed in a sandbox** — say so rather than claiming it's done.
- **Owner / access needed**: agent with LÖVR runtime access for the wiring;
  a human for the manual play-test step.
- **Depends on**: D1, D3, D6.
- **Blocks**: nothing further in this list (last player-facing delivery).

---

## D8 — Raspberry Pi deployment

- **Preconditions**: D6 merged and its integration test passing.
- **Process**:
  1. Target headless Raspberry Pi OS Lite (no desktop needed — the server
     never opens a window; see `server/conf.lua`'s `t.headless = true`).
  2. No official prebuilt LÖVR ARM64 Linux binary exists (verified via web
     search during this project's design phase) — build LÖVR from source
     for aarch64 per LÖVR's own CMake build docs, on or cross-compiled for
     the Pi.
  3. Write a `systemd` unit that starts `server/main.lua` under the built
     LÖVR binary on boot and restarts it on crash.
  4. Set up mDNS/Avahi so the Pi advertises a `.local` hostname (e.g.
     `dungeonhunter.local`) — players shouldn't need to know a raw IP.
  5. Open UDP port 7878 (the port `server/main.lua` binds) on the LAN
     interface only. Do **not** forward it to the WAN — matches v01's
     LAN-trust model (`CLAUDE.md`: "`MSG.SPECTATE` is currently trusted-LAN
     access with no authentication" — same posture applies here).
- **Postconditions** (acceptance test): a freshly-imaged Pi, powered on and
  connected to the home router, has the server running and reachable at its
  `.local` hostname from another device on the same LAN within one boot
  cycle, and recovers automatically (via `systemd` restart) if the server
  process is killed. **Requires physical Raspberry Pi hardware — cannot be
  verified in this sandbox.**
- **Owner / access needed**: agent or human with physical Pi access.
- **Depends on**: D6.
- **Blocks**: nothing (deployment delivery).

---

## D9 — Mesh distribution spike (gated, non-default)

- **Preconditions**: D6 and D8 have been running in real use for a while,
  **and** there's a measured (not speculative) CPU or latency reason to
  move a specific unit off the Pi. Until both hold, **do not start this
  packet** — it is a deliberate non-goal, not a backlog item to pick up
  early.
- **Process** (once gated conditions are met): extract one low-risk
  candidate unit — `interest.lua` (per-player, parallelizable, tolerant of
  a few ms extra latency since it runs once per tick per player) or
  `dungeon.lua` (runs once at level start, not on the hot path at all) —
  behind an ENet RPC boundary onto a second physical node. Do **not**
  extract `movement.lua`, `combat.lua`, or `respawn.lua` — these sit on the
  authoritative hot path where an inter-node round trip adds real input
  latency, and a single Pi handles them fine in-process.
- **Postconditions**: a written latency measurement (round-trip added by
  the extraction, measured, not estimated) and an explicit go/no-go
  recommendation on whether the split is worth keeping.
- **Owner / access needed**: TBD — only staffed once the gate conditions in
  Preconditions are actually met.
- **Depends on**: D6, D8, and a real operational trigger (see
  Preconditions).
- **Blocks**: nothing.
