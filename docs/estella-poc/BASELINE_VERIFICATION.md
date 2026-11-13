# Estella POC baseline verification

Date: 14 November 2026 (Australia/Brisbane)  
Branch: `feature/estella-poc`  
Environment: Windows, Node.js v24.16.0. Tests used individual source files retrieved from GitHub in a writable scratch directory.

| Test | Result | Evidence |
| --- | --- | --- |
| T02 — branch isolation | Partial | GitHub blob SHAs matched `main` for the root package and lockfile, `src/server/{index,game,dungeon}.js`, `src/shared/{config,constants}.js`, and `public/{index.html,client.js,dm.html,dm.js}`. A full branch diff was unavailable. |
| T05/T06/T11 — server protocol and fog prerequisites | Partial | A direct `Game` check used seed 12345 and set `CONFIG.revealAll = false` in memory. The player welcome omitted the tile grid. The first snapshot contained 81 of 2,816 tiles, every reveal value matched the corresponding DM tile, and the next snapshot drained the reveal delta. This check exercised the game class without WebSocket transport or an Estella client. |
| T08/T09 — spectator and cadence prerequisites | Partial | The DM snapshot contained both players. The configured tick rate was 20 Hz. A timed multiplayer run and frame measurements remain pending. |
| T01, T03–T04, T07, T10, T12–T16 | Blocked | The local checkout returned permission denied. The shell could not resolve GitHub for a scratch clone or the npm registry for dependency installation. No Estella engine build, gameplay run, or browser regression was executed. |

## Decision

HOLD at WP0/WP1. Resume in a workspace with access to the named checkout and its Git metadata, plus access to the package registry and a pinned Estella Web runtime. Capture local status before any branch operation. The working checkout was not modified during these checks.
