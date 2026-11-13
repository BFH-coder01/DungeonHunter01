# DungeonHunter — Estella 3D proof of concept

A separate first-person client for the existing DungeonHunter WebSocket server.
The original game at port 8080 and its Dungeon Master view are unchanged.

## Try it on Windows

Requires Node.js 20+ and a desktop browser with WebGL2 and WebAssembly.
From the repository root, start the ordinary server:

```powershell
npm install
npm start
```

In a second terminal:

```powershell
cd experiments/estella-client
npm run build
npm start
```

Open **http://localhost:5173** and select **Join dungeon**. Runtime dependencies
are vendored, so the client build needs no registry access or editor installation.
For another computer on the same LAN, use `http://<server-IP>:5173`; the default
WebSocket address follows that hostname on port 8080. Both server ports must be
reachable. The join form also accepts a custom `ws://` or `wss://` address.
Mouse lock needs a browser-trusted origin (localhost or HTTPS); arrow-key turning
works when mouse lock is unavailable over LAN HTTP.

| Control | Action |
| --- | --- |
| W / S | Move forward / backward |
| A / D | Strafe |
| Left / right arrows | Turn |
| Click the scene | Capture mouse for horizontal look |
| Escape | Release mouse |
| Space | Attack with equipped weapon |
| E | Open nearby cache / pick up item |
| Q | Cast equipped spell |
| Inventory button | Equip weapon or spell |
| Disconnect | Leave and reset; join again as a fresh player |

Gold boxes are caches, teal boxes are dropped items, red figures are other hunters.
Green floor strips mark stairs; level traversal remains outside this POC.
The camera follows server snapshots with a 50 ms interpolation buffer. Aim is
responsive locally, but position, collisions, damage, inventory and visibility
remain exclusively server-owned. Alive hunters have no name or health labels.
The POC has no audio or mobile controls; the original client retains its audio/UI.

## Build and tests

```powershell
npm ci
npm test
npm run build
npm run test:browser
node tests/security-browser.mjs
node tests/legacy-browser.mjs
node tests/live-server.mjs
```

`npm ci` installs only the pinned Playwright test tool. Browser tests use installed
Microsoft Edge in headless mode and expect ports 8080 and 5173 already running.
Set `BROWSER_CHANNEL=chrome` to use installed Chrome for the main browser test.
The security test briefly starts the existing server on port 8081 in a disposable
process with fog enabled in memory; no configuration files are changed.
The live-server test walks ordinary test players to a cache and into attack range
using movement intents; it makes real changes to the temporary running game.

For the full three-view / memory run:

```powershell
$env:SOAK_SECONDS='900'
npm run test:browser
```

Results go to `evidence/*.json`; screenshots and local server logs are ignored.
Read [the evaluation](../../docs/estella-poc/EVALUATION.md) for measured results,
remaining manual review and the distinction between automated and human tests.

## Runtime pin and provenance

- Engine release: **v0.104.1**, source commit
  `aed656a66def98a47f136ef5384c008f108757e0`.
- SDK internal package version: **0.12.0** (upstream does not track the release
  version in this field). The public npm `esengine@0.3.0` is not used.
- Source: https://github.com/esengine/estella/tree/v0.104.1
- Binary source: official `Estella-Editor-Setup-0.104.1.exe` release asset,
  SHA-256 `e2ee90a25ad85aa596c154b92af41135162f6d146391e7e59d78248267cd005a`.
- Only the matching `dist/wasm/esengine.js`, `esengine.wasm`, and the lean SDK's
  reachable JavaScript module graph are redistributed. The editor is not included,
  installed or launched. No Spine, physics or other optional WASM side modules
  are shipped or loaded.
- `vendor/estella/manifest.json` records exact SHA-256 hashes. Every build verifies
  them before copying local files to `dist/`; no CDN or latest-version fallback.
- Apache-2.0 `LICENSE`, upstream `NOTICE`, and third-party license texts accompany
  the runtime and are copied into every build. See [THIRD_PARTY.md](THIRD_PARTY.md).
- All dungeon geometry is generated from the server's player reveal deltas using
  the runtime's built-in cube. Colors, UI and application code are original to
  this experiment. No commercial Dungeon Master art, music or game data is used.

To refresh the same pin for an audit, download the named official release, verify
its hash, extract `$PLUGINSDIR/app-64.7z` with 7-Zip, then extract the
`resources/app.asar.unpacked` SDK and WASM directories. Run:

```powershell
node scripts/import-runtime.mjs <app.asar.unpacked-path> <pinned-upstream-source-path>
```

Keep the third-party license files alongside the imported runtime. Upgrading to a
different release needs deliberate API, browser, license and hash review.

## Isolation and rollback

All code and dependencies live here. The development host only serves `dist/`
on port 5173; it does not proxy or change the server protocol. Stop it to roll
back. Continue playing at http://localhost:8080/ or observing at
http://localhost:8080/dm.html. No merge to `main` is part of this POC.
