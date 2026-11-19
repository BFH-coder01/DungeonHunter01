# Portal preview

Open http://localhost:5174 and join. The isolated game server is `ws://localhost:8082`.
The preview starts beside a green portal with the full dungeon revealed. Press W to enter it.
Use the colored top-edge locator to find the other portals; `t` means tile distance.
Green, blue and yellow each connect two endpoints. Walk out of the arrival ring
before entering it again to return. Red gathers every living hunter on the level,
faces them into the arena, and then cools down for 20 seconds. Two browser windows
can join together to test gathering. Disconnected hunters are removed.

The preview fixture uses seed 12345, whose arena has 80 distinct landing spots.
Automated gathering coverage uses eight hunters; browser coverage uses two.
If a level's living population exceeds its landing capacity, red travel is declined
for everyone, without consuming cooldown; the entrant sees a capacity notice.

## Install on Windows

Install Node.js 20 or newer and Git. Run these commands in PowerShell from
the folder where you want the repository:

```powershell
git clone --branch feature/estella-poc https://github.com/BFH-coder01/DungeonHunter01.git
cd DungeonHunter01
npm ci
cd experiments/estella-client
```

The root install supplies the game server's WebSocket dependency. The Estella
runtime, meshes, textures, and model source files are bundled locally. Building
the client needs no asset downloads. For browser validation, also run `npm ci`
in this client directory and have Microsoft Edge installed.

## Start the portal preview

Open two PowerShell terminals, both in `experiments/estella-client` under your
clone. Ports 8082 and 5174 must be free.

In the first terminal, start the game:

```powershell
$env:PORTAL_TEST_PORT='8082'
$env:PORTAL_TEST_FOG='0'
node tests/portal-preview-server.mjs
```

In the second terminal, build and start the 3D client:

```powershell
$env:ESTELLA_DIST='dist-portals'
$env:ESTELLA_PORT='5174'
npm run build
node scripts/serve.mjs --dungeon-mode=3d
```

Open [the portal client](http://localhost:5174) and select **Join dungeon**.
The client selects game port 8082 automatically at this address. The preview
reveals the full map so walls, floors, and ceilings form a complete enclosure.
Setting `PORTAL_TEST_FOG=1` is for fog tests and displays only revealed tiles.

## Stop, restart, and switch renderer

Press **Ctrl+C** in the client terminal to stop port 5174. Press **Ctrl+C** in
the game terminal to stop port 8082. Restart using the commands above.
Stopping the game discards its in-memory players, inventory, and dungeon state.
The preview recreates seed 12345 on the next start.

To switch to Basic, close the client tab, stop the client host with **Ctrl+C**,
then run this in the same client terminal:

```powershell
node scripts/serve.mjs --dungeon-mode=basic
```

Reopen http://localhost:5174. To switch back, repeat with
`--dungeon-mode=3d`. Keep the game terminal running while changing renderer.

If an earlier background preview owns a port, identify its process before
stopping it:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 8082,5174 |
  Select-Object LocalPort,OwningProcess
Get-CimInstance Win32_Process -Filter 'ProcessId = 12345' |
  Select-Object ProcessId,CommandLine
# Replace 12345 with the confirmed preview process ID.
Stop-Process -Id 12345
```

The game command line should contain `tests/portal-preview-server.mjs`.
The client command line should contain `scripts/serve.mjs`. Use the port's
owning PID to distinguish this client from other Estella hosts.

## Update an existing clone

Stop the preview game and client, then run these from the repository root:

```powershell
git switch feature/estella-poc
git pull --ff-only
npm ci
cd experiments/estella-client
```

Preserve any local edits before pulling. Rebuild and restart using the two-terminal
instructions above. The preview uses its own `dist-portals` build directory.

The fixture supports ordinary join, movement, combat and spectator messages.
Its test placement controls are restricted to Node parent-process IPC.

## Validation

```powershell
node --test tests/*.test.mjs
node tests/portals-browser.mjs
```

The browser test explicitly enables fog with PORTAL_TEST_FOG=1.
The browser test refuses occupied ports 8083 and 5175, owns only its own child
processes, and leaves the 8082/5174 preview untouched. It tests both renderer modes,
all three travel colors, two-player gathering, aim, cooldown and reconnect. Results
and entrance/gathering screenshots are in `evidence/portal-*`.

Server tests cover 100 dungeon seeds, three-level small-room generation, unchanged
original layout/RNG, all-color round trips, destination lock, dead/other-level
exclusion, capacity rejection, fog isolation, and missed teleport snapshots.

Portals are public navigation landmarks. They do not grant access to unknown
terrain or ordinary hidden entities. Client metadata is optional for compatibility
with an older server. Teleport sequence and an independent red-facing revision
ensure even short jumps and a red-then-link jump between snapshots reconcile.

Existing masonry/ceiling work is retained. This preview builds into `dist-portals`,
leaving the usual `dist` output untouched. The portal implementation is maintained on the feature/estella-poc branch.
