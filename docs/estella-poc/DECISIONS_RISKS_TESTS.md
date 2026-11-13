# Estella POC — architecture decision record, risks, issues and verification register

Date: 2026-11-13 | Status: Planning only | Branch: feature/estella-poc
Companion: [Implementation plan](IMPLEMENTATION_PLAN.md)

## Decision log

| ID | Decision | Status | Reason | Revisit trigger |
|---|---|---|---|---|
| ADR-001 | Preserve existing Node server + 20 Hz authority | Accepted (POC) | Already implements movement, combat, snapshots and visibility | Explicit subsequent architecture approval |
| ADR-002 | Build separate Estella client; do not replace / | Accepted (POC) | Zero-disruption compare and rollback | Demonstrated stable pilot |
| ADR-003 | Reuse JOIN/WELCOME/STATE/INPUT/ACTION protocol | Accepted (POC) | Avoid server modifications or semantic drift | Protocol demonstrably inadequate; separate ADR |
| ADR-004 | Existing DM remains read-only at /dm.html | Accepted (POC) | Keep spectator independent and safe | Separate authorised DM-controls release |
| ADR-005 | Convert (x,y) tiles to engine (X,Z) at boundary, Y elevation | Proposed | Explicit units/orientation prevent rendering/physics drift | Coordinate fixture failure |
| ADR-006 | Geometry generated only from player-known tile reveal | Proposed | Existing fog semantics and information security | Reveal model changes |
| ADR-007 | Estella/SDK/editor versions pinned from proven clean build | Required gate | Upstream rapid development/API uncertainty | A stable tagged toolchain validated |
| ADR-008 | Estella physics must not resolve server position | Accepted (POC) | Prevent client/server authority split | Future prediction/reconciliation ADR |
| ADR-009 | Keep audio/HUD system as-is in legacy client; minimal POC UI | Accepted (POC) | Keep initial scope to rendering and networking | Successful 3D interaction baseline |
| ADR-010 | No automatic merge to main | Accepted (POC) | Working game must remain stable | Tests pass and PR approved |

## Risk register

Scoring: Probability (P) and Impact (I) each 1=Low, 2=Medium, 3=High. Exposure = P×I; 1-2 Low, 3-4 Medium, 6-9 High. Scores are planning judgments, not empirical measurements.

| Risk | P | I | Exposure | Mitigation and evidence | Owner | Status |
|---|---:|---:|---:|---|---|---|
| R01 Estella APIs/tooling immature or shifting | 3 | 3 | 9 High | Pin tag/commit; clean Windows build smoke test before integration | POC lead | Open |
| R02 Web build and dependency integration conflicts with zero-build legacy repo | 2 | 3 | 6 High | Separate experiments directory/build/origin; legacy routes untouched | Client lead | Open |
| R03 World-axis, aim sign and units mismatch | 2 | 2 | 4 Medium | Round-trip transform tests and map hallway fixture | Client lead | Open |
| R04 Excessive ECS entities/materials on 64×44 map | 2 | 2 | 4 Medium | Incremental chunks/instancing, FPS/memory profiling | Rendering lead | Open |
| R05 Fog-of-war data leak through full map generation | 2 | 3 | 6 High | Build only revealed geometry; negative leak test with revealAll=false | Gameplay lead | Open |
| R06 Multiplayer stutter at 20 Hz / missing prediction | 3 | 2 | 6 High | Snapshot buffer interpolation; keep server authority; capture jitter | Client lead | Open |
| R07 Server or legacy client regression | 2 | 3 | 6 High | Additive branch-only files, baseline and regression smoke suite | Maintainer | Open |
| R08 Misusing DM spectator protocol as player | 2 | 3 | 6 High | Separate role handling; no SPECTATE in Estella player client | Network lead | Open |
| R09 Estella editor distribution and dependency licensing misunderstood | 2 | 2 | 4 Medium | Review upstream LICENSE/NOTICE/business model; track asset provenance | Maintainer | Open |
| R10 Engine WASM load/bundle size unsuitable on LAN/mobile | 2 | 2 | 4 Medium | Cold-load, memory and build size metrics on target browser | QA lead | Open |
| R11 New features (multi-level, DM editing, native mobile) increase scope | 3 | 2 | 6 High | Strict WP0-WP6 POC scope; defer new features | POC lead | Open |
| R12 Static hosting / origin / websocket incompatibility | 2 | 2 | 4 Medium | Same-origin trial; dev proxy/origin documented; no server route edits | Network lead | Open |
| R13 Original Dungeon Master art/audio or name rights issues | 2 | 3 | 6 High | Original or verified licensed assets only; separate inspiration from copying | Maintainer | Open |
| R14 Disconnect/reconnect and stale entity handling | 2 | 2 | 4 Medium | Connection lifecycle tests; no assumption about persistent IDs | Client lead | Open |

## Issues and questions requiring evidence

| ID | Issue | Decision or test needed | State |
|---|---|---|---|
| I01 | Exact Estella compatible released version not pinned | Record tested release/commit and package versions from build | Open |
| I02 | Published Estella examples may not cover custom WS app | Verify browser SDK, bundling, runtime asset loading and connection | Open |
| I03 | Axis conventions, local transforms and camera-facing convention not proven | Run transform and rotation fixture | Open |
| I04 | POC build hosting choice undecided | Prove separate dev server/origin without changing Node host | Open |
| I05 | Performance and memory baseline not measured | Benchmark old client and Estella client on same Windows machine | Open |
| I06 | Source game test automation not in package.json | Define smoke-test commands/fixture harness; capture manual baseline first | Open |
| I07 | Current source flags intentionally expose full map | Test default configuration unchanged; security test only in separate disposable copy | Open |

## Test evidence ledger (not executed)

| Test | Title | Expected | Result | Evidence |
|---|---|---|---|---|
| T01 | Legacy startup and route baseline | Existing routes work | NOT RUN | — |
| T02 | Branch isolation | No legacy code diffs | NOT RUN | — |
| T03 | Clean Estella Windows build | Reproducible installation/build | NOT RUN | — |
| T04 | 3D room and corridor | Correct scene/camera/lights | NOT RUN | — |
| T05 | Existing WS join | Ordinary player joins unchanged server | NOT RUN | — |
| T06 | Map layout and reveal | Tile grid and secrecy correct | NOT RUN | — |
| T07 | Movement/wall collision | Server authoritative; <=0.25 tile settled drift | NOT RUN | — |
| T08 | 10-minute 2-player + DM run | No disconnection/regression | NOT RUN | — |
| T09 | 20Hz snapshots/render interpolation | No server tick edits; usable navigation | NOT RUN | — |
| T10 | Server-approved attack/pickup | Client sends intents only | NOT RUN | — |
| T11 | Fog-of-war negative test | No undiscovered map leaks | NOT RUN | — |
| T12 | Legacy regression | Existing UI/audio/inventory/combat work | NOT RUN | — |
| T13 | Desktop rendering performance | Median >=60 FPS, 1% low >=30 FPS target | NOT RUN | — |
| T14 | Startup/memory profiling | Cold-load/bundle/peak memory recorded, no sustained growth | NOT RUN | — |
| T15 | Reconnection/invalid state | Robust recovery/no privilege escalation | NOT RUN | — |
| T16 | Licensing/provenance | Obligations captured; no unlicensed assets | NOT RUN | — |

## Gate review template

- Gate: WP0 / WP1 / WP2 / WP3 / WP4 / WP5 / WP6
- Evaluator and date:
- DungeonHunter commit:
- Estella commit/tag:
- Test environment (Windows/browser/hardware):
- Test IDs pass / fail / blocked:
- Logs, screenshots, performance evidence:
- Outstanding high-exposure risks:
- Decision: PROCEED / HOLD / STOP
- Rationale and next owner:

## Change management rules

1. Changes in this branch start with documents only.
2. Future code additions live under `experiments/estella-client/` until proven.
3. Commit work packages separately; review changed file paths before pushing.
4. Avoid root dependencies, source server/shared edits and `public/` replacement in the POC.
5. Do not request merge to `main` without explicit review of regressions and test evidence.
6. Rollback is switching back to `main`; the original game remains the supported runtime.

## References

- https://github.com/BFH-coder01/DungeonHunter01
- https://github.com/esengine/estella
- https://estellaengine.com/docs
