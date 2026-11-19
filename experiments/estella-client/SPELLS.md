# Spellcasting preview

This preview includes Spark, Ember Burst, Frost Lance and Mend in a fully revealed
textured dungeon. A training hunter stands ahead of the starting position. The
fixture gives you all four spells, extra mana and faster mana regeneration for
testing. Normal games retain their original inventory and combat rules.

## Install and build on Windows

Install Node.js 20+ and Git, then run in PowerShell:

```powershell
git clone --branch feature/estella-poc https://github.com/BFH-coder01/DungeonHunter01.git
cd DungeonHunter01
npm ci
cd experiments/estella-client
$env:ESTELLA_DIST='dist-spells'
npm run build
```

For an existing clone, commit or preserve your local work before running
`git pull --ff-only origin feature/estella-poc`, then rebuild. Runtime assets are
bundled locally; Blender and Unreal Engine are not required.

## Start

Use two PowerShell terminals in `experiments/estella-client`. Ports 8084 and 5176
must be free; these are separate from the normal game and portal preview.

First terminal — isolated game fixture:

```powershell
$env:SPELL_TEST_PORT='8084'
node tests/spells-fixture-server.mjs
```

Second terminal — Estella client:

```powershell
$env:ESTELLA_DIST='dist-spells'
$env:ESTELLA_PROFILE='spells'
$env:ESTELLA_PORT='5176'
npm start -- --dungeon-mode=3d
```

Open **http://localhost:5176** and select **Join dungeon**. The server field
defaults to **ws://localhost:8084** on this preview port. The fixture is bound to
loopback for local testing. Join from a second browser window to see another
caster's effects.

## Test

- Select a spell in the inventory, then press **Q**, right-click, or use the spell
  button. Keys **2–5** select Spark, Ember Burst, Frost Lance and Mend.
- Aim toward the training hunter for a hit, and away for a miss. Move with WASD;
  turn with the arrow keys or click the scene to capture the mouse. Escape releases it.
- Mend restores health; you start below maximum health so the first heal is visible.
- Cast near walls to check that effects stay behind masonry. Try switching spells
  during recovery and travelling through a portal after casting.
- The target has extra health for repeated testing. Rejoin to reset your own
  test inventory, health and mana.

Damage and healing are still immediate server decisions. Particle motion is
cosmetic; it does not add projectile travel time or change the targeting cone.
Very old effects are skipped after a connection stall. Existing servers without
cast records retain the older hand-glow feedback.

The local Estella `examples/particle-demo` informed the soft radial sprite,
additive blending, short emitter lifetimes, noise, drag and floor-bounce approach.
The sprite is generated locally by `scripts/spell-texture.mjs`; this checkout does
not depend on the upstream example directory. Native particles provide soft glow
and drifting debris; small world meshes provide defined streaks and ice shards.
Effects are capped at eight active casters, 384 native particles and 288 mesh
particles. Both renderer modes use these effects, with Basic retaining its plain
dungeon and equipment geometry. Particle floor bounces are cosmetic; wall hit
positions and combat visibility come from the authoritative game grid.
If a spell reaches beyond sight, the client shows only the visible aim ray without
an impact cue. Hidden targets and their bearing remain undisclosed.

## Stop and switch modes

Press **Ctrl+C** in the Estella host terminal. To use Basic mode, restart that
same host with `npm start -- --dungeon-mode=basic`, then reload the browser. Mode
selection is fixed at host startup. Keep the game fixture running while switching.

Press **Ctrl+C** in the fixture terminal when finished with the spell preview.
Do not stop an unrelated authoritative game server on port 8080. If a preview was
started in the background, identify its listener and command line before stopping
only that process:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5176,8084 |
  Select-Object LocalPort,OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId = <PID>" |
  Select-Object ProcessId,CommandLine
Stop-Process -Id <verified-preview-PID>
```

## Automated checks

From the client directory, install the test dependencies with `npm ci` and have
Microsoft Edge installed. Build `dist-spells` as above, then run:

```powershell
npm test
node tests/spells-browser.mjs
```

The browser test owns ports 8085 and 5178, refuses occupied ports, restarts its
own host to test both modes, and closes its own processes afterward. Evidence
captures are written under `evidence/`.
With the preview running, `node tests/particle-probe.mjs` also captures a native
particle emitter with and without a solid occluding wall. Inspect both captures
when changing the engine bundle; the probe's numerical assertions alone do not
establish visual occlusion.

Addresses, ports, LAN access and explicit server URLs are configurable; see [network configuration](../../config/README.md).
