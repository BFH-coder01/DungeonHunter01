# Estella POC implementation and evaluation

Date: 14 November 2026 (Australia/Brisbane). Branch: `feature/estella-poc`.
Original game baseline: `ea7ab3ecf5da3eaf7ce4158c98bfadf50b9d3a47`.
Starting feature head: `1a4960602f3b6cebfefac5ed2738b6c85759b0a0`.
Runtime/tooling commit: `6d2255a`. Client/test implementation commit: `b4936b3`.
The final source also built successfully from a Git archive, proving the checked-in
runtime bytes pass integrity verification independently of the working copy.

## Delivery

The isolated Estella WebGL2/WASM client is implemented under
`experiments/estella-client/`. It renders the real server-generated map, follows
authoritative positions, interpolates snapshots, displays visible hunters and
loot, and sends existing movement, attack, cast, pickup and equip intents. It
has connection recovery, keyboard/mouse controls, inventory, health/mana and
performance diagnostics. It never sends spectator messages or client-owned
position, health, item or damage data.

The existing server, shared configuration, root dependencies, player view and
Dungeon Master view have zero diffs from the main baseline. The initial checkout
was clean; it was on `codex/fight-dynamics`. The requested remote feature branch
was fetched and checked out without resetting or discarding any work.

Start/test instructions: [client README](../../experiments/estella-client/README.md).
Open http://localhost:5173 for the POC, http://localhost:8080 for the original,
and http://localhost:8080/dm.html for Dungeon Master.

## Engine gate and architecture decisions

- Estella **v0.104.1**, source `aed656a66def98a47f136ef5384c008f108757e0`,
  SDK internal version 0.12.0. The npm package is older and was deliberately
  not substituted for the matching release runtime.
- The official release archive was extracted without installing or launching
  the editor. The lean SDK's reachable JavaScript and Web WASM core are pinned
  by SHA-256 and included with licenses/notices. No optional WASM modules or
  commercial game assets are used. See [provenance](../../experiments/estella-client/THIRD_PARTY.md).
- One tile = one world unit: `(game x, game y)` maps to `(world X, world Z)`;
  camera Y is 0.62. Engine local forward is -Z; yaw is `-aim - pi/2`.
- All geometry comes from validated reveal pairs. Unknown tiles stay `-1` and
  produce no geometry. Horizontal runs merge only equal, already-known tiles;
  only changed rows rebuild. The sampled 2,816-tile map required 340 map meshes.
- The client does not install physics. Position interpolation delays by one
  50 ms snapshot interval, never extrapolates, and snaps after respawn/teleport.
- Separate static host on port 5173, ordinary WebSocket connection to port 8080.
  The server's configured 20 Hz tick and protocol are unchanged.

## Verification and evidence

Environment: Windows, Node 24.16.0, Ryzen 9 7900X, Radeon RX 7900 XTX plus
integrated Radeon graphics. Headless Microsoft Edge 157.0.4341.46 and Chrome
157.0.8103.51, viewport 1280×720. These are local automated desktop results;
mobile, remote LAN latency and subjective audio quality are not measured.

| ID | Result | Evidence and limits |
| --- | --- | --- |
| T01 | PASS | Unchanged server started on canonical 8080; original player and DM loaded and joined. |
| T02 | PASS | `git diff origin/main -- src public package.json package-lock.json` is empty. Only experiment/docs additions. |
| T03 | PASS | Separate clean copy: `npm ci --ignore-scripts`, hash-verified `npm run build`; no editor, CDN or root dependency changes. Vendored bytes are protected against Git newline conversion. |
| T04 | PASS | Real Estella WASM/WebGL2 scene rendered in both browsers; screenshots inspected for floor/wall alignment and camera view. |
| T05 | PASS | Real JOIN/WELCOME/STATE exchange with existing `src/server/index.js`. |
| T06 | PASS | Seed 12345 model fixture compares every revealed tile with DM truth; coordinate and cardinal-facing checks pass. |
| T07 | PASS | Server movement fixture stops at walls; browser movement uses real controls and settled camera drift is 0 tiles. |
| T08 | PASS | Estella + original player + DM completed the 900-second run, with no JS errors or connection failures; final reconnect also passed. |
| T09 | PASS | Independent frame loop, one-snapshot interpolation, no extrapolation. Configured tick remains 20 Hz; observed Windows snapshots are about 19/s. |
| T10 | PASS | Browser emits existing attack/pickup intents; ordinary WebSocket test players walk to a cache and attack range. Inventory changes and target HP 125→117 confirmed by actual server snapshots. |
| T11 | PASS | Fixed-seed test discloses 81/2,816 tiles. Separate real-server browser fog run disclosed/rendered only 59/2,816 tiles; no full map in welcome, no spectator messages. |
| T12 | PASS, automated smoke | Original UI: 8 inventory slots; movement, equip, pickup, attack and cast intents; server mana reduction. 12 audio buffers decoded, 2 sources started, no audio warnings or JS errors. Listening quality remains a human check. |
| T13 | MEASURED | Approximately 60 FPS: median 59.88, sampled 1% low about 59.17. Near the proposed 60 FPS target rather than a claim of strictly ≥60. Meets the proposed ≥30 FPS low target. |
| T14 | MEASURED / PASS for play-test | 900-second run: WASM heap constant 17,301,504 bytes; sampled JS heap 15,982,716–29,188,530 bytes with GC drops. Fresh-context ready time 512 ms Edge / 525 ms Chrome, plus first-scene shader compilation. |
| T15 | PASS | Browser disconnect clears all map/entities; rejoin works. Blur sends zero movement; unexpected DM welcome resets the UI. Invalid/partial reveal and non-finite positions rejected atomically in model tests. |
| T16 | PASS for this distribution | Runtime provenance, Apache LICENSE/NOTICE, core third-party texts and original procedural asset provenance included. No Spine runtime or editor redistribution. |

Machine-readable evidence lives in
[`experiments/estella-client/evidence/`](../../experiments/estella-client/evidence/):
`browser-results.json`, `chrome-results.json`, `security-results.json`,
`legacy-results.json`, `live-actions.json`, and `final-smoke.json`. Screenshots are generated by the
tests and retained locally, not committed. Five focused Node tests pass.

Chrome's fresh browser-context load to enabled Join took 525 ms. The first real
3D frame also needs shader compilation (initial smoke observed roughly 2.4 seconds
of shader work); the join-button time is not a claim of time-to-playable-scene.
The distribution is approximately 6.42 MB uncompressed including runtime,
application and license files; core WASM is 2,359,337 bytes. There is no bundler
or dynamic network dependency in the game build.

The long run received approximately 18.99 snapshots/s with the original 20 Hz
configuration. WASM memory was constant at every sample. JS heap began at
17,356,358 bytes and ended at 24,808,824 bytes, with a late GC trough of 17,184,104
bytes after 851 seconds. This is evidence of bounded sampled allocation during
this run, not a full retained-object leak analysis or whole-process/GPU-memory
measurement. Raw frame samples use a rolling 1,800-frame window; percentiles
exclude the first 120 entries. The long run preceded small HUD/reconnect/timing
diagnostic refinements; the final build received a separate browser smoke check.

## Gate decision

**GO for user play-testing on the feature branch. No merge approval.** WP0–WP5
are implemented and exercised; WP6 contains the reproducible tests, measurements,
provenance and review checklist. The original strict median ≥60 FPS threshold
was not literally exceeded (59.88 measured); practical near-60 Hz behavior and
the >30 FPS low make this suitable for this POC's human review. Human gameplay
feel, audio listening and additional device/LAN testing remain review work.

## Existing limitations kept intact

1. **Server action events are cleared before snapshot fan-out.** Live attack and
   pickup change authoritative state but yielded zero event messages in the test.
   Both clients inherit this; the POC relies on snapshots for health/inventory.
   This was already listed in `CLAUDE.md` and is not repaired in this renderer POC.
2. **Full inventory can consume a cache/drop before capacity is checked.** This
   existing server issue is also documented in `CLAUDE.md`. Avoid full-inventory
   pickup when evaluating the renderer; fix on a separately reviewed server branch.
3. Default `revealAll=true` intentionally remains unchanged. Fog tests change
   it only in disposable test process memory. DM remains trusted-LAN/read-only.
4. No audio migration, multi-level traversal, mobile controls, local position
   prediction or upgraded DM controls. Geometry uses simple original primitives.
5. Performance is local headless-browser evidence, not a guarantee on other
   hardware. Some ancillary tests ran during the long soak. The full-main source
   code is unchanged; human listening and gameplay feel still require review.

## User play-test checklist

1. Join the POC and original client in separate windows; keep the DM roster open.
2. Walk/strafe down a corridor and into a wall; turn with arrows or captured mouse.
   Compare positions in DM and confirm no wall crossing or settled drift.
3. Move close to a gold cache and press E; inspect the authoritative inventory or
   attribute change. Equip an item, attack a nearby second player with Space,
   and cast with Q. Watch health/mana, given the inherited event-log limitation.
4. Disconnect/rejoin; check the original client still moves and plays its audio.
5. Report browser, controls used and any console error alongside feedback.

Review remains required before any merge to `main`. Stop port 5173 to roll back;
the unchanged original game remains available on 8080.
