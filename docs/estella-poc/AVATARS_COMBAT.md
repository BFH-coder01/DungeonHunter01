# Avatar, weapon and combat presentation

Date: 14 November 2026 (Australia/Brisbane). Branch: `feature/estella-poc`.

This follows the completed baseline POC and the request to deliver avatars,
weapons and attack mechanics for the Estella client.

## Delivered

- Original hooded hunter model: robe, hood, face shadow, eyes, belt, gloves and
  boots. Facing follows server aim; walking follows interpolated displacement.
  Death uses a fallen pose; disappearing/non-visible players are removed.
- Distinct first-person and remote Rusted Dagger, Short Sword, War Axe, Spear and
  Maul models. Equipment is driven by authoritative inventory/equipment fields.
- Swing/recovery and spear-thrust animation, weapon-swap lowering, colored cast
  glow, avatar damage flash and local damage vignette. Kill confirmation uses
  the server's own kill counter. No predicted hit markers or invented damage.
- Left-click/Space attacks, right-click/Q casts, 1–8 or inventory clicks equip;
  visible Attack/Cast buttons also work without pointer lock. HUD shows weapon
  name, damage, reach, recovery, swap and insufficient-mana feedback.
- No health/name overlays for living opponents, new physics, audio assets,
  modified combat balance, or changed original/DM client files.

## Server delta and compatibility

The baseline renderer POC required zero server changes. This requested follow-up
adds **presentation metadata only** in `Game.snapshotFor`; the old packet did
not identify the remote equipped weapon or attack timing. No combat method,
network handler, tick rate, shared catalogue or legacy UI is changed.

| Field | Meaning |
| --- | --- |
| `state.self.swingRemaining` | Remaining authoritative weapon cooldown in milliseconds |
| `state.others[].weapon` | Visible weapon `{name, swingMs}`, or null when unarmed |
| `state.others[].swingRemaining` | Remaining authoritative weapon cooldown for animation |
| `state.others[].cast` | Active spell `{name, cooldownMs, remaining}`, otherwise null |

All opponent fields are emitted **after** the existing same-level/visibility
checks. They disclose no additional inventory, mana or undiscovered entity.
Original clients ignore the extra fields. The new client also accepts old
snapshots, rendering the remote hunter without invented equipment/attack poses.
Local cosmetic feedback works on the old server, with estimated cooldowns;
restarting the updated server enables authoritative cooldown reconciliation and
the full remote weapon/action presentation.

Damage/range/line-of-sight, forward cone, attack cadence, weapon-swap delay,
mana, casting, death, inventory and respawn stay server-owned. Existing action
events may still be dropped by the baseline server's event clearing; this change
does not depend on those events and does not alter that behavior.

## Verification

- Eight Node tests pass, including all earlier map/authority tests, distinct model
  geometry, coordinate transforms, input cooldown gating, death/reset handling,
  authoritative remaining time, and a fog-negative check for display metadata.
- `tests/combat-browser.mjs`: isolated server on 8081, real `Game` movement/combat,
  test-only placement/inventory. All five models equipped and displayed; recovery
  disables attack input; remote War Axe/swing fields observed; casting consumes
  server mana; repeated in-range spear attacks produce an authoritative kill;
  disconnect clears avatar and held-weapon entities. No browser JS errors.
- Captured and visually inspected first-person/remote avatar images. Screenshot
  files are local under `experiments/estella-client/evidence/combat-*.png`.
  Machine-readable results: `evidence/combat-results.json`.
- The combat run's final 300-frame sample measured median 59.88 FPS and 1% low
  59.17 FPS on the same Edge/Windows machine as the baseline. Initial shaders
  still compile on first use; this is a warm sample, not a cold-load guarantee.
- `tests/server-compatibility.mjs` launched the actual updated HTTP/WebSocket
  server on isolated port 8081. Original player movement, inventory, attack,
  cast, pickup and Web Audio checks passed; the unchanged DM rendered its roster.
  Evidence: `evidence/combat-legacy-results.json`.
- `npm run build`, JavaScript syntax checks and `git diff --check` are required
  before delivery. `public/`, server HTTP/WebSocket handlers, shared constants,
  item balance and root dependencies remain unchanged.

## Rollout

The built client is served on port 5173. One existing player was active on port
8080 during delivery, so that server has not been interrupted. A restart is the
only remaining deployment step for remote equipment/attack timing, and it will
reset that process's in-memory dungeon and player progress. Request the user's
timing before stopping the active game. No merge to `main` is authorized.
