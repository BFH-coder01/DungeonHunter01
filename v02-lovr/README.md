# DungeonHunter v02 — LÖVR / ENet track

Parallel, experimental track. **v01 (`src/`, `public/`) is untouched and remains
the playable version** while this is built up.

## Why this exists

v01 is a browser client talking to a Node + `ws` server, designed to run from
a Raspberry Pi on the home LAN. This track explores going full 3D with
[LÖVR](https://lovr.org) instead of a browser Canvas raycaster:

- **Server**: LÖVR run with `t.headless = true` (see `server/conf.lua`) — no
  window, no `lovr.graphics`, no `lovr.headset`. Just LuaJIT + `lua-enet` for
  realtime UDP. This is what runs on the Raspberry Pi. No GPU pipeline
  required on the Pi in this design.
- **Client**: full LÖVR with graphics enabled, run on players' own machines
  (desktop or VR headset via OpenXR). Connects to the server over ENet UDP.

This is a bigger commitment than v01: players run a native LÖVR app instead
of opening a browser tab, and the server speaks ENet/UDP instead of
WebSocket/TCP. See `CLAUDE.md` in the repo root for the v01 working
agreement this track intentionally departs from.

## Status

Skeleton only. `server/main.lua` and `client/main.lua` establish an ENet
handshake and nothing else yet — no dungeon generation, replication,
prediction, or interest management. Those are the real work and are **not**
implemented here.

**Untested.** LÖVR is not installed in this development environment; these
files have not been run. Verify locally with the LÖVR runtime
(`lovr v02-lovr/server` / `lovr v02-lovr/client`) before relying on them.

## Architecture notes / responsibilities to build out

Same authoritative-server principle as v01 (see repo `CLAUDE.md`): the server
owns world state; clients send intent only.

1. **Replication** — server decides what state each client's snapshot
   contains and serializes it over ENet's unreliable/unsequenced channels for
   high-frequency state (position, aim) and a reliable channel for events
   (damage, pickups, deaths). `shared/protocol.lua` is where message shapes
   should be centralized, mirroring the role of `src/shared/constants.js` in
   v01.
2. **Prediction** — client should locally predict its own movement from
   input and reconcile against authoritative server snapshots (unlike v01,
   which only predicts view angle and smooths server position). Needed
   because UDP + Wi-Fi round trip makes raw server-authoritative movement
   feel laggy in first-person 3D.
3. **Interest management** — the server must not send state a client
   shouldn't see (mirrors the v01 "no visibility outside allowed state" and
   "no name/health overlay for alive opponents" rules). For v02 this also
   becomes a bandwidth concern, not just a fairness one, since ENet payloads
   are hand-serialized rather than JSON over an already-open WebSocket.

## Distribution

Target: fused/bundled per-platform client executables (LÖVR supports fusing
a project with its runtime into a single binary) so players don't need to
install LÖVR themselves. Not set up yet.
