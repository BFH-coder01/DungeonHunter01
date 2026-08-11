# DungeonHunter01 setup and deployment

This guide is for the machine hosting a DungeonHunter01 game on a trusted home
LAN. Player and DungeonMaster devices only need a modern desktop browser.

## Prerequisites

Install these on the host:

- Git.
- Node.js 20 or newer, including npm.
- Access to the private GitHub repository `BFH-coder01/DungeonHunter01`.

Check the runtime before cloning:

```bash
node --version
npm --version
git --version
```

## Clone the private repository

Use SSH when the machine has a GitHub SSH key:

```bash
git clone git@github.com:BFH-coder01/DungeonHunter01.git
cd DungeonHunter01
```

Alternatively, use HTTPS and authenticate with GitHub when prompted:

```bash
git clone https://github.com/BFH-coder01/DungeonHunter01.git
cd DungeonHunter01
```

The default branch is `main`. Development work is tested on feature branches
and merged only after approval; check out a named feature branch only when you
intend to test that branch.

## Install dependencies

```bash
npm ci
```

Use `npm ci`, not `npm install`, for a reproducible machine deployment. It
installs the exact versions in `package-lock.json`; the only current production
package is `ws`.

This project does not use Python. `requirements.txt` is intentionally
comment-only so deployment scanners that expect the file can accept the
repository without installing Python packages.

## Start the server

```bash
npm start
```

The process binds to all local interfaces on TCP port 8080 and prints URLs such
as:

```text
Open on this machine:  http://localhost:8080
Open on the home wifi: http://192.168.1.23:8080
```

Use these endpoints:

- Player UI: `http://HOST:8080/`
- DungeonMaster UI: `http://HOST:8080/dm.html`

On Windows, allow Node.js through Windows Defender Firewall on **private
networks** when prompted. Player devices must be on the same reachable LAN and
must use the host's LAN address, not `localhost`.

## Development mode

```bash
npm run dev
```

Development mode restarts the server when source files change. Browser files
are served with `Cache-Control: no-cache`, so a page refresh loads current
client code.

## Port configuration

Port 8080 is canonical and changes only when the `PORT` environment variable is
set. To deliberately use another port:

PowerShell:

```powershell
$env:PORT = '8090'
npm start
```

Bash:

```bash
PORT=8090 npm start
```

Remove or unset `PORT` to return to 8080.

If startup reports that port 8080 is already in use, identify the listener on
Windows before stopping anything:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
Get-Process -Id <OwningProcess>
```

Stop only the confirmed obsolete DungeonHunter01 process. Do not switch ports
silently, because players and the DM expect the advertised URL to remain stable.

## Verify a deployment

After startup:

1. Open `http://localhost:8080/` on the host and join as a player.
2. Open `http://localhost:8080/dm.html` in another window.
3. Confirm that the DM sees the complete dungeon, caches, sound points,
   projectiles, and all player movement.
4. Confirm Z activates the left hand, M activates the right hand, and Space
   casts the prepared spell.
5. Connect a second device using the printed LAN URL and confirm movement and
   spatial audio.

The current repository has syntax and manual gameplay checks but no automated
`npm test` script yet.

## Update an existing clone

Commit or stash local work first, then update without creating an accidental
merge commit:

```bash
git switch main
git pull --ff-only
npm ci
npm start
```

Restart the Node process after server or shared-module changes.

## Deployment boundaries

DungeonHunter01 is currently a trusted-LAN proof of concept:

- HTTP static files and WebSocket traffic use one Node process.
- There is no frontend compilation or generated build directory.
- There is no authentication, TLS termination, database, or persistent game
  state.
- Do not expose the server directly to the public internet in its current form.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the system design and current
visibility/security constraints.
